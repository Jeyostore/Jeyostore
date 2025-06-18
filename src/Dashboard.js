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
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
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
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [topSellingMetric, setTopSellingMetric] = useState("qty");


  const formatRupiah = useCallback((number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number),
    []
  );

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

  const capitalizeForDisplay = useCallback((string) => {
    if (!string) return "";
    const lowerString = string.toLowerCase();
    // Normalisasi spesifik untuk tipe customer
    if (lowerString === "non-reseller") return "Non-Reseller";
    if (lowerString === "reseller") return "Reseller";
    
    // Hanya membuat huruf pertama kapital untuk string lain (nama produk, kategori, dll)
    return lowerString.charAt(0).toUpperCase() + lowerString.slice(1);
  }, []);

  const totalRevenue = sales.reduce((sum, sale) => {
    const product = products.find((p) => p.id === sale.productId);
    return sum + sale.qty * (sale.price || product?.price || 0);
  }, 0);

  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const totalProductsSold = sales.reduce((sum, sale) => sum + sale.qty, 0);

  const salesByCategory = useCallback(() => {
    const resellerSales = { count: 0, revenue: 0 };
    const nonresellerSales = { count: 0, revenue: 0 };

    sales.forEach(sale => {
      const saleRevenue = sale.qty * (sale.price || products.find(p => p.id === sale.productId)?.price || 0);

      if ((sale.customerType || '').toLowerCase() === 'reseller') {
        resellerSales.count += sale.qty;
        resellerSales.revenue += saleRevenue;
      } else {
        nonresellerSales.count += sale.qty;
        nonresellerSales.revenue += saleRevenue;
      }
    });

    return [
      { name: capitalizeForDisplay('reseller'), 'Jumlah Terjual': resellerSales.count, 'Pendapatan': resellerSales.revenue },
      { name: capitalizeForDisplay('non-reseller'), 'Jumlah Terjual': nonresellerSales.count, 'Pendapatan': nonresellerSales.revenue },
    ];
  }, [sales, products, capitalizeForDisplay]);

  const getSalesDataForTimeFilter = useCallback(() => {
    const now = new Date();
    const filteredSales = sales.filter(sale => {
      if (!sale.soldAt?.toDate) return false;
      const saleDate = sale.soldAt.toDate();

      if (timeFilter === 'daily') {
        return saleDate.getDate() === now.getDate() &&
               saleDate.getMonth() === now.getMonth() &&
               saleDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'weekly') {
        const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        return saleDate >= sevenDaysAgo && saleDate <= now;
      } else if (timeFilter === 'monthly') {
        return saleDate.getMonth() === now.getMonth() &&
               saleDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'yearly') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      return false;
    });

    const dataMap = new Map();
    filteredSales.forEach(sale => {
      const saleDate = sale.soldAt.toDate();
      const salePrice = sale.price || products.find(p => p.id === sale.productId)?.price || 0;
      const revenue = sale.qty * salePrice;

      let key;
      if (timeFilter === 'daily') {
        key = saleDate.getHours().toString().padStart(2, '0') + ':00';
      } else if (timeFilter === 'weekly') {
        key = saleDate.toLocaleString("id-ID", { weekday: 'short', day: 'numeric' });
      } else if (timeFilter === 'monthly') {
        key = saleDate.toLocaleString("id-ID", { month: "short", day: 'numeric' });
      } else if (timeFilter === 'yearly') {
        key = saleDate.toLocaleString("id-ID", { month: "short" });
      }

      dataMap.set(key, (dataMap.get(key) || 0) + revenue);
    });

    let sortedData = Array.from(dataMap.entries()).map(([name, Pendapatan]) => ({ name, Pendapatan }));

    if (timeFilter === 'daily') {
      sortedData.sort((a, b) => parseInt(a.name.split(':')[0]) - parseInt(b.name.split(':')[0]));
    } else if (timeFilter === 'weekly') {
      const dayOrder = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      sortedData.sort((a, b) => {
        const dayA = a.name.substring(0, 3);
        const dayB = b.name.substring(0, 3);
        return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
      });
    } else if (timeFilter === 'monthly') {
      sortedData.sort((a, b) => {
        const dateA = parseInt(a.name.match(/\d+/)[0]);
        const dateB = parseInt(b.name.match(/\d+/)[0]);
        return dateA - dateB;
      });
    } else if (timeFilter === 'yearly') {
      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      sortedData.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
    }

    return sortedData;
  }, [sales, products, timeFilter]);

  const topSellingProducts = useCallback(() => {
    const productData = {};
    sales.forEach(sale => {
      const nameForGrouping = (sale.productName || products.find(p => p.id === sale.productId)?.name || 'Produk Dihapus');
      const salePrice = sale.price || products.find(p => p.id === sale.productId)?.price || 0;
      const revenue = sale.qty * salePrice;

      if (!productData[nameForGrouping]) {
        productData[nameForGrouping] = { qty: 0, revenue: 0 };
      }
      productData[nameForGrouping].qty += sale.qty;
      productData[nameForGrouping].revenue += revenue;
    });

    const sortedProducts = Object.entries(productData)
      .sort(([, a], [, b]) => (topSellingMetric === 'qty' ? b.qty - a.qty : b.revenue - a.revenue))
      .slice(0, 5)
      .map(([productNameKey, data]) => {
        return { name: capitalizeForDisplay(productNameKey), ...data };
      });

    return sortedProducts;
  }, [sales, products, capitalizeForDisplay, topSellingMetric]);

  const salesPerProductCategory = useCallback(() => {
    const categoryData = {};
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      let category = (sale.productCategory || product?.category || 'Tidak Berkategori');
      category = capitalizeForDisplay(category);

      const salePrice = sale.price || product?.price || 0;
      const revenue = sale.qty * salePrice;

      if (!categoryData[category]) {
        categoryData[category] = { count: 0, revenue: 0 };
      }
      categoryData[category].count += sale.qty;
      categoryData[category].revenue += revenue;
    });

    return Object.entries(categoryData).map(([name, data]) => ({
      name,
      'Jumlah Terjual': data.count,
      'Pendapatan': data.revenue,
    }));
  }, [sales, products, capitalizeForDisplay]);

  const lowStockProducts = products.filter(
    (product) => (product.stock || 0) <= 10
  );

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
      setLoading(false);
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
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200">
      {/* Pesan Sambutan untuk Mobile */}
      <div className="md:hidden bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-xl shadow-md mb-6 text-white text-center font-bold text-xl">
        Hallo Bubub ❤️
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Ringkasan Dashboard
      </h1>

      {/* --- Bagian Kartu Statistik --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Bagian Grafik Penjualan Bulanan (Sekarang dengan filter waktu) --- */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <CalendarDaysIcon className="w-6 h-6 mr-2 text-indigo-500" />
            Grafik Pendapatan
          </h2>
          {/* Filter Waktu */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setTimeFilter('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${timeFilter === 'daily' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setTimeFilter('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${timeFilter === 'weekly' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setTimeFilter('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${timeFilter === 'monthly' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setTimeFilter('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${timeFilter === 'yearly' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Tahunan
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={getSalesDataForTimeFilter()}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" tick={{ fill: "currentColor", opacity: 0.6 }} />
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

        {/* --- Bagian Produk Terlaris (Dengan pilihan metrik) --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <FireIcon className="w-6 h-6 mr-2 text-red-500" />
            Produk Terlaris
          </h2>
          {/* Pilihan Metrik */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setTopSellingMetric('qty')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${topSellingMetric === 'qty' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Berdasarkan Kuantitas
            </button>
            <button
              onClick={() => setTopSellingMetric('revenue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${topSellingMetric === 'revenue' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              Berdasarkan Pendapatan
            </button>
          </div>
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
                  {topSellingMetric === 'qty' ? `${product.qty} terjual` : formatRupiah(product.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Bagian Statistik Kategori Pembeli (Reseller vs Non-Reseller) --- */}
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

        {/* --- Bagian Grafik Penjualan per Kategori Produk --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <ChartBarIcon className="w-6 h-6 mr-2 text-green-500" />
            Penjualan per Kategori Produk
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={salesPerProductCategory()}
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
              <Bar dataKey="Jumlah Terjual" fill="#3B82F6" radius={[0, 8, 8, 0]} />
              <Bar dataKey="Pendapatan" fill="#EC4899" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Data Jumlah Penjualan dan Pendapatan berdasarkan Kategori Produk.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Bagian Penjualan Terbaru --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <ClockIcon className="w-6 h-6 mr-2 text-blue-500" />
            Penjualan Terbaru
          </h2>
          {/* Desktop View: Berurutan ke bawah */}
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 hidden md:block">
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

          {/* Mobile View: Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {sales.slice(0, 5).map((sale, index) => {
              const product = products.find((p) => p.id === sale.productId);
              const productName = sale.productName || (product ? product.name : 'Produk Dihapus');
              const saleTotal = sale.qty * (sale.price || product?.price || 0);
              return (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white mb-1 truncate">
                      {productName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Jumlah: <span className="font-medium">{sale.qty} unit</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-base font-bold text-gray-800 dark:text-white">
                      {formatRupiah(saleTotal)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTanggal(sale.soldAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            {sales.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada penjualan terbaru.
              </p>
            )}
          </div>
        </div>

        {/* --- Bagian Produk Stok Rendah --- */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-500" />
            Produk Stok Rendah
          </h2>
          {/* Desktop View: Berurutan ke bawah */}
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 hidden md:block">
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

          {/* Mobile View: Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                  <p className="font-bold text-gray-800 dark:text-white mb-1 truncate">
                    {product.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Stok:{" "}
                    <span className="font-bold text-red-600 dark:text-red-300">
                      {product.stock || 0} unit
                    </span>
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada produk dengan stok rendah. Bagus!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}