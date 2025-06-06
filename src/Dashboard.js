import React, { useEffect, useState } from "react";
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
import { CubeIcon, BanknotesIcon, ArchiveBoxIcon, ShoppingCartIcon, FireIcon } from "@heroicons/react/24/outline";
import ClipLoader from "react-spinners/ClipLoader";

// Komponen untuk kartu statistik
const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600",
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} text-white p-6 rounded-2xl shadow-lg flex items-center`}>
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
  
  // Kalkulasi data
  const totalRevenue = sales.reduce((sum, sale) => {
    const product = products.find(p => p.id === sale.productId);
    return sum + (product ? sale.qty * product.price : 0);
  }, 0);

  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const totalProductsSold = sales.reduce((sum, sale) => sum + sale.qty, 0);
  
  // Data untuk grafik penjualan bulanan
  const salesPerMonth = () => {
    const monthlySales = Array(12).fill(0);
    const now = new Date();
    sales.forEach((sale) => {
      if(sale.soldAt?.toDate) {
        const saleDate = sale.soldAt.toDate();
        if (saleDate.getFullYear() === now.getFullYear()) {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                monthlySales[saleDate.getMonth()] += sale.qty * product.price;
            }
        }
      }
    });
    return monthlySales.map((revenue, i) => ({
      month: new Date(now.getFullYear(), i).toLocaleString("id-ID", { month: "short" }),
      Pendapatan: revenue,
    }));
  };

  // Data untuk produk terlaris
  const topSellingProducts = () => {
    const productSales = {};
    sales.forEach(sale => {
      productSales[sale.productId] = (productSales[sale.productId] || 0) + sale.qty;
    });
    return Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, qty]) => {
        const product = products.find(p => p.id === productId);
        return { name: product ? product.name : 'Produk Dihapus', qty };
      });
  };

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const productsQuery = query(collection(db, "products"), orderBy("name", "asc"));
    const salesQuery = query(collection(db, "sales"), orderBy("soldAt", "desc"));

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); // Hentikan loading setelah data penjualan (yang utama) didapat
    });

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, []);

  const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
  
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<BanknotesIcon className="w-7 h-7" />} title="Total Pendapatan" value={formatRupiah(totalRevenue)} color="green" />
        <StatCard icon={<ShoppingCartIcon className="w-7 h-7" />} title="Produk Terjual" value={totalProductsSold} color="indigo"/>
        <StatCard icon={<CubeIcon className="w-7 h-7" />} title="Jenis Produk" value={products.length} color="blue"/>
        <StatCard icon={<ArchiveBoxIcon className="w-7 h-7" />} title="Total Stok" value={totalStock} color="amber"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Bagian Grafik Penjualan --- */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Grafik Pendapatan Bulanan
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesPerMonth()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="month" tick={{ fill: 'currentColor', opacity: 0.6 }} />
              <YAxis tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)} tick={{ fill: 'currentColor', opacity: 0.6 }}/>
              <Tooltip 
                cursor={{fill: 'rgba(79, 70, 229, 0.1)'}}
                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '0.75rem', color: '#fff' }}
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
            <FireIcon className="w-6 h-6 mr-2 text-red-500"/>
            Produk Terlaris
          </h2>
          <ul className="space-y-4">
            {topSellingProducts().map((product, index) => (
              <li key={index} className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-4">{product.name}</span>
                <span className="font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{product.qty} terjual</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
