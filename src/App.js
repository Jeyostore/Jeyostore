import React, { useEffect, useState } from "react";
import { db } from "./firebase"; // pastikan konfigurasi Firebase sudah benar
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function App() {
  // States
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states produk
  const [productName, setProductName] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);

  // Form states penjualan
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("");

  // Modal hapus
  const [modalDelete, setModalDelete] = useState({ isOpen: false, type: "", id: null });

  // Load data produk
  async function fetchProducts() {
    const q = query(collection(db, "products"), orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
  }

  // Load data penjualan
  async function fetchSales() {
    const q = query(collection(db, "sales"), orderBy("soldAt", "desc"));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSales(items);
  }

  // Load semua saat mount
  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  // Reset form produk
  function resetProductForm() {
    setProductName("");
    setProductStock("");
    setProductPrice("");
    setEditingProductId(null);
  }

  // Tambah atau edit produk
  async function handleAddOrEditProduct(e) {
    e.preventDefault();
    if (!productName.trim() || productStock === "" || productPrice === "") {
      alert("Mohon isi semua data produk dengan benar.");
      return;
    }

    setLoading(true);

    try {
      if (editingProductId) {
        // Update produk
        const productRef = doc(db, "products", editingProductId);
        await updateDoc(productRef, {
          name: productName.trim(),
          stock: Number(productStock),
          price: Number(productPrice),
        });
      } else {
        // Tambah produk baru
        await addDoc(collection(db, "products"), {
          name: productName.trim(),
          stock: Number(productStock),
          price: Number(productPrice),
        });
      }
      resetProductForm();
      fetchProducts();
    } catch (err) {
      alert("Gagal menyimpan produk: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Mulai edit produk (isi form)
  function startEditProduct(product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductStock(product.stock);
    setProductPrice(product.price);
  }

  // Hapus produk
  async function handleDeleteProduct(id) {
    setModalDelete({ isOpen: false, type: "", id: null });
    setLoading(true);
    try {
      await deleteDoc(doc(db, "products", id));

      // Hapus juga penjualan terkait produk ini (optional)
      const salesQuery = query(collection(db, "sales"), where("productId", "==", id));
      const salesSnapshot = await getDocs(salesQuery);
      const batchDeletes = salesSnapshot.docs.map((docSnap) => deleteDoc(doc(db, "sales", docSnap.id)));
      await Promise.all(batchDeletes);

      fetchProducts();
      fetchSales();
    } catch (err) {
      alert("Gagal menghapus produk: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Catat penjualan
  async function handleSale(e) {
    e.preventDefault();
    if (!saleProductId || saleQty === "") {
      alert("Pilih produk dan isi jumlah penjualan.");
      return;
    }
    const product = products.find((p) => p.id === saleProductId);
    if (!product) {
      alert("Produk tidak ditemukan.");
      return;
    }
    if (product.stock < Number(saleQty)) {
      alert(`Stok tidak cukup. Stok tersedia: ${product.stock}`);
      return;
    }

    setLoading(true);
    try {
      // Tambah penjualan
      await addDoc(collection(db, "sales"), {
        productId: saleProductId,
        qty: Number(saleQty),
        soldAt: serverTimestamp(),
      });

      // Update stok produk
      const productRef = doc(db, "products", saleProductId);
      await updateDoc(productRef, {
        stock: product.stock - Number(saleQty),
      });

      setSaleProductId("");
      setSaleQty("");
      fetchProducts();
      fetchSales();
    } catch (err) {
      alert("Gagal mencatat penjualan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Hapus penjualan
  async function handleDeleteSale(id) {
    setModalDelete({ isOpen: false, type: "", id: null });
    setLoading(true);
    try {
      const saleRef = doc(db, "sales", id);
      // Cari data penjualan utk rollback stok produk
      const saleSnap = await saleRef.get();
      const saleData = saleSnap.data();

      if (saleData) {
        // Kembalikan stok produk
        const productRef = doc(db, "products", saleData.productId);
        const productSnap = await productRef.get();
        const productData = productSnap.data();
        if (productData) {
          await updateDoc(productRef, {
            stock: productData.stock + saleData.qty,
          });
        }
      }

      await deleteDoc(saleRef);
      fetchProducts();
      fetchSales();
    } catch (err) {
      alert("Gagal menghapus penjualan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Hitung total pendapatan
  function calculateTotalIncome() {
    let total = 0;
    for (const sale of sales) {
      const product = products.find((p) => p.id === sale.productId);
      if (product) total += sale.qty * product.price;
    }
    return total;
  }

  // Format tanggal
  function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <div
        className="min-h-screen bg-indigo-50 p-5 font-poppins text-indigo-900"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-indigo-700">Jeyo Store Official</h1>
          <p className="text-indigo-500 mt-1 italic font-light text-sm">
            
          </p>
        </header>

        {/* Form Penjualan */}
        <section className="mb-8 bg-white rounded-2xl p-6 shadow-md border border-indigo-300">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4 border-b border-indigo-400 pb-2">
            Catat Penjualan
          </h2>
          <form onSubmit={handleSale} className="flex flex-col gap-4">
            <select
              value={saleProductId}
              onChange={(e) => setSaleProductId(e.target.value)}
              className="bg-indigo-50 border border-indigo-300 rounded-xl px-4 py-3 text-indigo-700 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={loading}
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stok: {p.stock})
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={saleQty}
              onChange={(e) => setSaleQty(e.target.value)}
              placeholder="Jumlah Terjual"
              className="bg-indigo-50 border border-indigo-300 rounded-xl px-4 py-3 text-indigo-700 text-base placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white rounded-xl py-3 text-lg font-semibold shadow hover:bg-indigo-700 transition disabled:opacity-60"
            >
              Catat Penjualan
            </button>
          </form>
        </section>

        {/* Form Produk */}
        <section className="mb-8 bg-white rounded-2xl p-6 shadow-md border border-indigo-300">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4 border-b border-indigo-400 pb-2">
            {editingProductId ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <form onSubmit={handleAddOrEditProduct} autoComplete="off" className="flex flex-col gap-4">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Nama Produk"
              className="bg-indigo-50 border border-indigo-300 rounded-xl px-4 py-3 text-indigo-700 text-base placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={loading}
            />
            <input
              type="number"
              min={0}
              value={productStock}
              onChange={(e) => setProductStock(e.target.value)}
              placeholder="Stok"
              className="bg-indigo-50 border border-indigo-300 rounded-xl px-4 py-3 text-indigo-700 text-base placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={loading}
            />
            <input
              type="number"
              min={0}
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="Harga"
              className="bg-indigo-50 border border-indigo-300 rounded-xl px-4 py-3 text-indigo-700 text-base placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={loading}
            />
            <div className="flex gap-4">
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  disabled={loading}
                  className="flex-grow bg-gray-300 text-indigo-700 py-3 rounded-xl font-semibold hover:bg-gray-400 transition"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-grow bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {editingProductId ? "Simpan Perubahan" : "Tambah Produk"}
              </button>
            </div>
          </form>
        </section>

        {/* List Produk */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Data Produk</h2>
          {products.length === 0 ? (
            <p className="text-indigo-400 italic text-center">Tidak ada produk</p>
          ) : (
            <div className="space-y-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 shadow-md border border-indigo-300 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-lg text-indigo-800">{p.name}</h3>
                    <p className="text-indigo-600 font-mono">Stok: {p.stock}</p>
                    <p className="text-indigo-700 font-mono">
                      Harga:{" "}
                      {p.price.toLocaleString("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => startEditProduct(p)}
                      title="Edit Produk"
                      className="text-indigo-600 hover:text-indigo-900 transition"
                      disabled={loading}
                    >
                      <PencilIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setModalDelete({ isOpen: true, type: "product", id: p.id })}
                      title="Hapus Produk"
                      className="text-red-500 hover:text-red-700 transition"
                      disabled={loading}
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* List Penjualan */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Data Penjualan</h2>
          {sales.length === 0 ? (
            <p className="text-indigo-400 italic text-center">Belum ada penjualan</p>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => {
                const product = products.find((p) => p.id === sale.productId);
                return (
                  <div
                    key={sale.id}
                    className="bg-white rounded-2xl p-5 shadow-md border border-indigo-300 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-lg text-indigo-800">
                        {product ? product.name : "(Produk Terhapus)"}
                      </h3>
                      <p className="text-indigo-600 font-mono">Jumlah: {sale.qty}</p>
                      <p className="text-indigo-700 font-mono">Tanggal: {formatDate(sale.soldAt)}</p>
                    </div>
                    <button
                      onClick={() => setModalDelete({ isOpen: true, type: "sale", id: sale.id })}
                      title="Hapus Penjualan"
                      className="text-red-500 hover:text-red-700 transition"
                      disabled={loading}
                    >
                      <TrashIcon className="w-6 h-6" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Total Pendapatan */}
        <div className="text-center text-indigo-700 font-extrabold text-xl mb-8">
          Total Pendapatan:{" "}
          <span className="text-green-600">
            {calculateTotalIncome().toLocaleString("id-ID", {
              style: "currency",
              currency: "IDR",
            })}
          </span>
        </div>

        {/* Modal Hapus */}
        {modalDelete.isOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={() => setModalDelete({ isOpen: false, type: "", id: null })}
          >
            <div
              className="bg-white rounded-xl p-6 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-indigo-700 mb-4">
                Konfirmasi Hapus
              </h3>
              <p className="mb-6 text-indigo-600">
                Apakah Anda yakin ingin menghapus{" "}
                {modalDelete.type === "product" ? "produk ini" : "data penjualan ini"}?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setModalDelete({ isOpen: false, type: "", id: null })}
                  className="px-4 py-2 rounded-xl bg-gray-300 font-semibold text-indigo-700 hover:bg-gray-400 transition"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    if (modalDelete.type === "product") {
                      await handleDeleteProduct(modalDelete.id);
                    } else if (modalDelete.type === "sale") {
                      await handleDeleteSale(modalDelete.id);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                  disabled={loading}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
