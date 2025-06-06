import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { PlusCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";
import ClipLoader from "react-spinners/ClipLoader";

// Komponen Notifikasi (bisa dipindahkan ke file terpisah jika digunakan di banyak tempat)
function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle = "fixed top-20 right-5 p-4 rounded-lg shadow-lg text-white z-50 animate-slide-in";
  const typeStyle = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    <div className={`${baseStyle} ${typeStyle}`}>
      {message}
    </div>
  );
}

export default function AddProduct() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  
  // State untuk URL Gambar dan Ukuran sudah dihapus

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !stock) {
      setNotification({ type: 'error', message: 'Nama, Harga, dan Stok produk wajib diisi.' });
      return;
    }
    setLoading(true);

    try {
      await addDoc(collection(db, "products"), {
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        stock: Number(stock),
        // Properti imageUrl dan sizes dihapus dari objek yang dikirim ke Firestore
        isHidden: false,
        createdAt: serverTimestamp(),
        lastStockAddedAt: null,
        lastStockAddedQty: 0
      });

      setNotification({ type: 'success', message: 'Produk berhasil ditambahkan!' });

      // Reset form
      setName("");
      setCategory("");
      setPrice("");
      setStock("");

      // Arahkan ke halaman daftar produk setelah beberapa saat
      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err) {
      console.error("Error adding document: ", err);
      setNotification({ type: 'error', message: 'Gagal menambahkan produk. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

  return (
    <>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
            <SparklesIcon className="w-8 h-8 text-indigo-500"/>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Tambah Produk Baru</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Produk</label>
              <input type="text" id="product-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Terserah bub" className={inputStyle} />
            </div>

            <div>
              <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori (Opsional)</label>
              <input type="text" id="product-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Contoh: Terserah bub" className={inputStyle} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga (Rp)</label>
                  <input type="number" id="product-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" className={inputStyle} />
                </div>
                <div>
                  <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stok Awal</label>
                  <input type="number" id="product-stock" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="50" className={inputStyle} />
                </div>
            </div>
          
          {/* Input untuk Ukuran dan URL Gambar sudah dihapus */}
          
          {/* Tombol Aksi */}
          <div className="pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:bg-indigo-400"
            >
              {loading ? (
                <ClipLoader color="#ffffff" size={20} />
              ) : (
                <>
                  <PlusCircleIcon className="w-6 h-6" />
                  <span>Tambahkan Produk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
