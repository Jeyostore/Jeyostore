import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useNavigate } from "react-router-dom";

export default function AddProduct() {
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || stock === "" || price === "") {
      alert("Isi semua data");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        name: name.trim(),
        stock: Number(stock),
        price: Number(price),
      });
      alert("Produk berhasil ditambahkan!");
      navigate("/"); // balik ke halaman utama
    } catch (err) {
      alert("Gagal tambah produk: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Tambah Produk Baru</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nama Produk"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          className="border border-indigo-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="number"
          min={0}
          placeholder="Stok"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          disabled={loading}
          className="border border-indigo-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="number"
          min={0}
          placeholder="Harga"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
          className="border border-indigo-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
        >
          Simpan Produk
        </button>
      </form>
    </div>
  );
}
