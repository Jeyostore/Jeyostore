import React, { useEffect, useState, useCallback } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CubeIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  FireIcon,
  UsersIcon,
  TagIcon,
  ClockIcon, // Ikon untuk penjualan terbaru
  ExclamationTriangleIcon, // Ikon untuk stok rendah
} from "@heroicons/react/24/outline";
import ClipLoader from "react-spinners/ClipLoader";

// Komponen untuk kartu statistik
const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600",
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    pink: "from-pink-500 to-pink-600",
    teal: "from-teal-500 to-teal-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} text-white p-6 rounded-2xl shadow-lg flex items-center`}
    >
      <div className="mr-4 bg-white/20 p-3 rounded-full">{icon}</div>
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi utilitas untuk format Rupiah
  const formatRupiah = useCallback((number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number),
    []
  );

  // Fungsi utilitas untuk format Tanggal
  const formatTanggal = useCallback((timestamp) => {
    if (!timestamp?.toDate) return "Tanggal tidak valid";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, []);

  // Fungsi utilitas untuk mengonversi string ke format "Huruf Awal Kapital" (untuk tampilan)
  const capitalizeForDisplay = useCallback((string) => {
    if (!string) return "";
    const lowerString = string.toLowerCase();
    if (lowerString === "non-reseller") return "Non-Reseller";
    if (lowerString === "reseller") return "Reseller";
    // FIX: Ini untuk kategori produk seperti "makaroni" atau "mie lidi"
    // Akan membuat "makaroni pedas" menjadi "Makaroni"
    if (lowerString.includes("makaroni")) return "Makaroni";
    if (lowerString.includes("mie lidi")) return "Mie Lidi";

    return lowerString.charAt(0).toUpperCase() + lowerString.slice(1);
  }, []);

  // Kalkulasi data yang sudah ada
  const totalRevenue = sales.reduce((sum, sale) => {
    const product = products.find((p) => p.id === sale.productId);
    return sum + sale.qty * (sale.price || product?.price || 0);
  }, 0);

  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const totalProductsSold = sales.reduce((sum, sale) => sum + sale.qty, 0);

  // --- Kalkulasi Pendapatan Makaroni & Mie Lidi (Terpisah) ---
  const totalMakaroniRevenue = sales.reduce((sum, sale) => {
    const saleCategory = (sale.productCategory || '').toLowerCase();
    const saleProductName = (sale.productName || '').toLowerCase(); 

    if (saleCategory.includes('makaroni') || saleProductName.includes('makaroni')) { // FIX: Gunakan .includes() untuk perbandingan yang lebih fleksibel
      const product = products.find(p => p.id === sale.productId); 
      return sum + (sale.qty * (sale.price || product?.price || 0));
    }
    return sum;
  }, 0);

  const totalMieLidiRevenue = sales.reduce((sum, sale) => {
    const saleCategory = (sale.productCategory || '').toLowerCase();
    const saleProductName = (sale.productName || '').toLowerCase(); 

    if (saleCategory.includes('mie lidi') || saleProductName.includes('mie lidi')) { // FIX: Gunakan .includes() untuk perbandingan yang lebih fleksibel
      const product = products.find(p => p.id === sale.productId); 
      return sum + (sale.qty * (sale.price || product?.price || 0));
    }
    return sum;
  }, 0);

  // --- Kalkulasi Statistik Kategori reseller vs non-reseller ---
  const salesByCategory = useCallback(() => {
    const resellerSales = { count: 0, revenue: 0 };
    const nonresellerSales = { count: 0, revenue: 0 };

    sales.forEach(sale => {
      const saleRevenue = sale.qty * (sale.price || products.find(p => p.id === sale.productId)?.price || 0);

      if ((sale.customerType || '').toLowerCase() === 'reseller') {
        resellerSales.count += sale.qty;
        resellerSales.revenue += saleRevenue;
      } else { // Semua yang bukan 'reseller' dianggap 'non-reseller' (termasuk undefined/null)
        nonresellerSales.count += sale.qty;
        nonresellerSales.revenue += saleRevenue;
      }
    });

    return [
      { name: capitalizeForDisplay('reseller'), 'Jumlah Terjual': resellerSales.count, 'Pendapatan': resellerSales.revenue },
      { name: capitalizeForDisplay('non-reseller'), 'Jumlah Terjual': nonresellerSales.count, 'Pendapatan': nonresellerSales.revenue },
    ];
  }, [sales, products, capitalizeForDisplay]);

  // Data untuk grafik penjualan bulanan
  const salesPerMonth = useCallback(() => {
    const monthlySales = Array(12).fill(0);
    const now = new Date();
    sales.forEach((sale) => {
      if (sale.soldAt?.toDate) {
        const saleDate = sale.soldAt.toDate();
        if (saleDate.getFullYear() === now.getFullYear()) {
          const salePrice = sale.price || products.find(p => p.id === sale.productId)?.price || 0;
          monthlySales[saleDate.getMonth()] += sale.qty * salePrice;
        }
      }
    });
    return monthlySales.map((revenue, i) => ({
      month: new Date(now.getFullYear(), i).toLocaleString("id-ID", {
        month: "short",
      }),
      Pendapatan: revenue,
    }));
  }, [sales, products]);

  // Data untuk produk terlaris
  const topSellingProducts = useCallback(() => {
    const productSales = {};
    sales.forEach(sale => {
      // Menggunakan productName dari sale doc, lalu fallback ke name dari products
      const nameForGrouping = (sale.productName || products.find(p => p.id === sale.productId)?.name || 'Produk Dihapus').toLowerCase();
      productSales[nameForGrouping] = (productSales[nameForGrouping] || 0) + sale.qty;
    });

    return Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productNameKey, qty]) => {
        // Tampilkan dengan capitalizeForDisplay
        return { name: capitalizeForDisplay(productNameKey), qty };
      });
  }, [sales, products, capitalizeForDisplay]);

  // Data untuk produk stok rendah
  const lowStockProducts = products.filter(
    (product) => (product.stock || 0) <= 10
  );

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name", "asc")
    );
    const salesQuery = query(
      collection(db, "sales"),
      orderBy("soldAt", "desc")
    );

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false); // Hentikan loading setelah data penjualan (yang utama) didapat
    });

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <ClipLoader color="#4F46E5" loading={loading} size={50} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* --- Bagian Kartu Statistik --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<BanknotesIcon className="w-7 h-7" />}
          title="Total Pendapatan"
          value={formatRupiah(totalRevenue)}
          color="green"
        />
        <StatCard
          icon={<ShoppingCartIcon className="w-7 h-7" />}
          title="Produk Terjual"
          value={totalProductsSold}
          color="indigo"
        />
        <StatCard
          icon={<CubeIcon className="w-7 h-7" />}
          title="Jenis Produk"
          value={products.length}
          color="blue"
        />
        <StatCard
          icon={<ArchiveBoxIcon className="w-7 h-7" />}
          title="Total Stok"
          value={totalStock}
          color="amber"
        />
        <StatCard
          icon={<TagIcon className="w-7 h-7" />}
          title="Pendapatan Makaroni"
          value={formatRupiah(totalMakaroniRevenue)}
          color="purple"
        />
        <StatCard
          icon={<TagIcon className="w-7 h-7" />}
          title="Pendapatan Mie Lidi"
          value={formatRupiah(totalMieLidiRevenue)}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Bagian Grafik Penjualan Bulanan --- */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Grafik Pendapatan Bulanan
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={salesPerMonth()}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" tick={{ fill: "currentColor", opacity: 0.6 }} />
              <YAxis
                tickFormatter={(value) =>
                  new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
                    value
                  )
                }
                tick={{ fill: "currentColor", opacity: 0.6 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  borderRadius: "0.75rem",
                  color: "#fff",
                }}
                formatter={(value) => [formatRupiah(value), "Pendapatan"]}
              />
              <Legend />
              <Bar dataKey="Pendapatan" fill="#4F46E5" barSize={30} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* --- Bagian Produk Terlaris --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <FireIcon className="w-6 h-6 mr-2 text-red-500" />
            Produk Terlaris
          </h2>
          <ul className="space-y-4">
            {topSellingProducts().map((product, index) => (
              <li
                key={index}
                className="flex justify-between items-center text-sm"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-4">
                  {product.name}
                </span>
                <span className="font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                  {product.qty} terjual
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* --- Bagian Statistik Kategori Pembeli (Reseller vs Non-Reseller) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <UsersIcon className="w-6 h-6 mr-2 text-teal-500" />
            Statistik Kategori Pembeli
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={salesByCategory()}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis
                type="number"
                tickFormatter={(value) => value.toLocaleString("id-ID")}
                tick={{ fill: "currentColor", opacity: 0.6 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "currentColor", opacity: 0.6 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  borderRadius: "0.75rem",
                  color: "#fff",
                }}
                formatter={(value, name) => {
                  if (name === "Pendapatan") {
                    return [formatRupiah(value), name];
                  }
                  return [value.toLocaleString("id-ID") + " unit", name];
                }}
              />
              <Legend />
              <Bar dataKey="Jumlah Terjual" fill="#10B981" radius={[0, 8, 8, 0]} />
              <Bar dataKey="Pendapatan" fill="#FACC15" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Data Jumlah Penjualan Reseller atau Non-reseller
          </p>
        </div>

        {/* --- Bagian Penjualan Terbaru --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <ClockIcon className="w-6 h-6 mr-2 text-blue-500" />
            Penjualan Terbaru
          </h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {sales.slice(0, 5).map((sale, index) => {
              const product = products.find((p) => p.id === sale.productId);
              const productName = sale.productName || (product ? product.name : 'Produk Dihapus');
              const saleTotal = sale.qty * (sale.price || product?.price || 0);
              return (
                <li
                  key={index}
                  className="py-3 flex justify-between items-center text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {productName} ({sale.qty} unit)
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatTanggal(sale.soldAt)}
                    </p>
                  </div>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {formatRupiah(saleTotal)}
                  </span>
                </li>
              );
            })}
            {sales.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada penjualan terbaru.
              </p>
            )}
          </ul>
        </div>
      </div>

      {/* --- Bagian Produk Stok Rendah --- */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
          <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-500" />
          Produk Stok Rendah
        </h2>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {lowStockProducts.length > 0 ? (
            lowStockProducts.map((product, index) => (
              <li
                key={index}
                className="py-3 flex justify-between items-center text-sm"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-4">
                  {product.name}
                </span>
                <span className="font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded-md">
                  {product.stock || 0} unit
                </span>
              </li>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Tidak ada produk dengan stok rendah. Bagus!
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}