import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [salesPerMonth, setSalesPerMonth] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Ambil produk
    const productSnapshot = await getDocs(collection(db, "products"));
    const productsData = productSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setProducts(productsData);

    // Ambil sales
    const salesSnapshot = await getDocs(collection(db, "sales"));
    const salesData = salesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Hitung total pendapatan
    let revenue = 0;
    salesData.forEach((sale) => {
      const product = productsData.find((p) => p.id === sale.productId);
      if (product) revenue += sale.qty * product.price;
    });
    setTotalRevenue(revenue);

    // Hitung total stok
    const stock = productsData.reduce((acc, p) => acc + (p.stock || 0), 0);
    setTotalStock(stock);

    // Hitung penjualan per bulan (tahun ini)
    const now = new Date();
    const year = now.getFullYear();
    const monthlySales = Array(12).fill(0);

    salesData.forEach((sale) => {
      if (!sale.soldAt?.toDate) return;
      const soldDate = sale.soldAt.toDate();
      if (soldDate.getFullYear() === year) {
        monthlySales[soldDate.getMonth()] += sale.qty;
      }
    });

    const chartData = monthlySales.map((qty, i) => ({
      month: new Date(year, i).toLocaleString("id-ID", { month: "short" }),
      qty,
    }));
    setSalesPerMonth(chartData);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-indigo-700 text-center sm:text-left">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-indigo-100 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Produk</h2>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>

        <div className="bg-indigo-100 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Stok</h2>
          <p className="text-3xl font-bold">{totalStock}</p>
        </div>

        <div className="bg-indigo-100 p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-2">Total Pendapatan</h2>
          <p className="text-3xl font-bold">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700">
          Penjualan Bulanan (Qty)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={salesPerMonth}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="qty" fill="#4F46E5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
