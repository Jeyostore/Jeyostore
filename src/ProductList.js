import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { PencilIcon, TrashIcon, XMarkIcon, CheckIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states penjualan
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("");

  // Modal hapus
  const [modalDelete, setModalDelete] = useState({ isOpen: false, type: "", id: null });

  // Filter waktu (rentang waktu)
  const [filter, setFilter] = useState("all");

  // Total pendapatan dari penjualan
  const [totalRevenue, setTotalRevenue] = useState(0);

  // State edit produk
  const [editingProductId, setEditingProductId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // State tambah stok produk
  const [addingStockId, setAddingStockId] = useState(null);
  const [addedStockQty, setAddedStockQty] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [filter, products]);

  useEffect(() => {
    let total = 0;
    sales.forEach((sale) => {
      const product = products.find((p) => p.id === sale.productId);
      if (product) {
        total += sale.qty * product.price;
      }
    });
    setTotalRevenue(total);
  }, [sales, products]);

  async function fetchProducts() {
    try {
      const q = query(collection(db, "products"), orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    } catch (err) {
      alert("Gagal mengambil produk: " + err.message);
    }
  }

  async function fetchSales() {
    try {
      let salesQuery = collection(db, "sales");

      if (filter !== "all") {
        const now = new Date();
        let startDate;

        if (filter === "thisWeek") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(now.getFullYear(), now.getMonth(), diff);
          startDate.setHours(0, 0, 0, 0);
        } else if (filter === "thisMonth") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        salesQuery = query(
          collection(db, "sales"),
          where("soldAt", ">=", startDate),
          orderBy("soldAt", "desc")
        );
      } else {
        salesQuery = query(collection(db, "sales"), orderBy("soldAt", "desc"));
      }

      const snapshot = await getDocs(salesQuery);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSales(items);
    } catch (err) {
      alert("Gagal mengambil penjualan: " + err.message);
    }
  }

  async function handleSale(e) {
    e.preventDefault();
    if (!saleProductId || !saleQty || Number(saleQty) <= 0) {
      alert("Pilih produk dan isi jumlah penjualan dengan angka yang valid.");
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
      await addDoc(collection(db, "sales"), {
        productId: saleProductId,
        qty: Number(saleQty),
        soldAt: serverTimestamp(),
      });

      const productRef = doc(db, "products", saleProductId);
      await updateDoc(productRef, {
        stock: product.stock - Number(saleQty),
      });

      setSaleProductId("");
      setSaleQty("");
      await Promise.all([fetchProducts(), fetchSales()]);
    } catch (err) {
      alert("Gagal mencatat penjualan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSale(id) {
    setModalDelete({ isOpen: false, type: "", id: null });
    setLoading(true);
    try {
      const saleRef = doc(db, "sales", id);
      const saleSnap = await getDoc(saleRef);
      const saleData = saleSnap.data();

      if (saleData) {
        const productRef = doc(db, "products", saleData.productId);
        const productSnap = await getDoc(productRef);
        const productData = productSnap.data();
        if (productData) {
          await updateDoc(productRef, {
            stock: productData.stock + saleData.qty,
          });
        }
      }

      await deleteDoc(saleRef);
      await Promise.all([fetchProducts(), fetchSales()]);
    } catch (err) {
      alert("Gagal menghapus penjualan: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(id) {
    setModalDelete({ isOpen: false, type: "", id: null });
    setLoading(true);
    try {
      await deleteDoc(doc(db, "products", id));

      // Hapus penjualan terkait produk ini (optional)
      const salesQuery = query(collection(db, "sales"), where("productId", "==", id));
      const salesSnapshot = await getDocs(salesQuery);
      const batchDeletes = salesSnapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, "sales", docSnap.id))
      );
      await Promise.all(batchDeletes);

      await fetchProducts();
      await fetchSales();
    } catch (err) {
      alert("Gagal menghapus produk: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product) {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditStock(product.stock.toString());
    setEditPrice(product.price.toString());
  }

  function cancelEdit() {
    setEditingProductId(null);
    setEditName("");
    setEditStock("");
    setEditPrice("");
  }

  async function saveEdit(id) {
    if (!editName.trim()) {
      alert("Nama produk tidak boleh kosong.");
      return;
    }
    if (isNaN(editStock) || Number(editStock) < 0) {
      alert("Stok harus berupa angka 0 atau lebih.");
      return;
    }
    if (isNaN(editPrice) || Number(editPrice) < 0) {
      alert("Harga harus berupa angka 0 atau lebih.");
      return;
    }

    setLoading(true);
    try {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        name: editName.trim(),
        stock: Number(editStock),
        price: Number(editPrice),
      });
      await fetchProducts();
      cancelEdit();
    } catch (err) {
      alert("Gagal menyimpan perubahan produk: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Mulai tambah stok produk
  function startAddStock(id) {
    setAddingStockId(id);
    setAddedStockQty("");
  }

  // Batalkan tambah stok
  function cancelAddStock() {
    setAddingStockId(null);
    setAddedStockQty("");
  }

  // Simpan tambah stok produk
  async function saveAddStock(id) {
    if (!addedStockQty || isNaN(addedStockQty) || Number(addedStockQty) <= 0) {
      alert("Masukkan jumlah stok yang valid (lebih dari 0).");
      return;
    }

    setLoading(true);
    try {
      const product = products.find((p) => p.id === id);
      if (!product) {
        alert("Produk tidak ditemukan.");
        setLoading(false);
        return;
      }

      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        stock: product.stock + Number(addedStockQty),
        lastStockAddedAt: serverTimestamp(),
      });

      await fetchProducts();
      cancelAddStock();
    } catch (err) {
      alert("Gagal menambah stok: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Format timestamp dengan aman
  function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    if (timestamp.toDate) {
      try {
        return timestamp.toDate().toLocaleString();
      } catch {
        return "-";
      }
    }
    return "-";
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daftar Produk</h1>

      <div className="mb-4 flex gap-4 items-center">
        <select
          className="border p-2 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Semua Waktu</option>
          <option value="thisWeek">Minggu Ini</option>
          <option value="thisMonth">Bulan Ini</option>
        </select>
      </div>

      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Nama Produk</th>
            <th className="border border-gray-300 p-2">Stok</th>
            <th className="border border-gray-300 p-2">Harga</th>
            <th className="border border-gray-300 p-2">Terakhir Tambah Stok</th>
            <th className="border border-gray-300 p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border border-gray-300">
              {editingProductId === product.id ? (
                <>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={loading}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      disabled={loading}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      disabled={loading}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="border p-2">{formatTimestamp(product.lastStockAddedAt)}</td>
                  <td className="border p-2 flex gap-2">
                    <button
                      onClick={() => saveEdit(product.id)}
                      disabled={loading}
                      className="bg-green-500 text-white p-1 rounded disabled:opacity-50"
                    >
                      <CheckIcon className="h-5 w-5 inline" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={loading}
                      className="bg-red-500 text-white p-1 rounded disabled:opacity-50"
                    >
                      <XMarkIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="border p-2">{product.name}</td>
                  <td className="border p-2">{product.stock}</td>
                  <td className="border p-2">Rp {product.price.toLocaleString()}</td>
                  <td className="border p-2">{formatTimestamp(product.lastStockAddedAt)}</td>
                  <td className="border p-2 flex gap-2">
                    <button
                      onClick={() => startEdit(product)}
                      className="bg-blue-500 text-white p-1 rounded"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setModalDelete({ isOpen: true, type: "product", id: product.id })}
                      className="bg-red-500 text-white p-1 rounded"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    {addingStockId === product.id ? (
                      <>
                        <input
                          type="number"
                          min="1"
                          value={addedStockQty}
                          onChange={(e) => setAddedStockQty(e.target.value)}
                          disabled={loading}
                          className="border p-1 w-16"
                        />
                        <button
                          onClick={() => saveAddStock(product.id)}
                          disabled={loading}
                          className="bg-green-500 text-white p-1 rounded"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelAddStock}
                          disabled={loading}
                          className="bg-red-500 text-white p-1 rounded"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startAddStock(product.id)}
                        className="bg-yellow-500 text-white p-1 rounded"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold mt-8 mb-4">Tambah Penjualan</h2>
      <form onSubmit={handleSale} className="flex gap-4 items-center mb-8">
        <select
          value={saleProductId}
          onChange={(e) => setSaleProductId(e.target.value)}
          disabled={loading}
          className="border p-2 rounded"
          required
        >
          <option value="">Pilih Produk</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} (Stok: {product.stock})
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Jumlah"
          value={saleQty}
          onChange={(e) => setSaleQty(e.target.value)}
          disabled={loading}
          className="border p-2 rounded w-24"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 rounded disabled:opacity-50"
        >
          Catat Penjualan
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">Daftar Penjualan</h2>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Produk</th>
            <th className="border border-gray-300 p-2">Jumlah</th>
            <th className="border border-gray-300 p-2">Tanggal Penjualan</th>
            <th className="border border-gray-300 p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center p-4">
                Tidak ada data penjualan.
              </td>
            </tr>
          )}
          {sales.map((sale) => {
            const product = products.find((p) => p.id === sale.productId);
            return (
              <tr key={sale.id} className="border border-gray-300">
                <td className="border p-2">{product ? product.name : "Produk tidak ditemukan"}</td>
                <td className="border p-2">{sale.qty}</td>
                <td className="border p-2">{formatTimestamp(sale.soldAt)}</td>
                <td className="border p-2">
                  <button
                    onClick={() => setModalDelete({ isOpen: true, type: "sale", id: sale.id })}
                    disabled={loading}
                    className="bg-red-600 text-white p-1 rounded disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 font-semibold text-lg">
        Total Pendapatan: Rp {totalRevenue.toLocaleString()}
      </div>

      {/* Modal Hapus */}
      {modalDelete.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="mb-6">
              Apakah Anda yakin ingin menghapus{" "}
              {modalDelete.type === "product" ? "produk ini" : "penjualan ini"}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setModalDelete({ isOpen: false, type: "", id: null })}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Batal
              </button>
              {modalDelete.type === "product" ? (
                <button
                  onClick={() => handleDeleteProduct(modalDelete.id)}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Hapus Produk
                </button>
              ) : (
                <button
                  onClick={() => handleDeleteSale(modalDelete.id)}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Hapus Penjualan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
