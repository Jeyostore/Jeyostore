import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
  onSnapshot, // Menggunakan onSnapshot untuk real-time updates
} from "firebase/firestore";
import { PencilIcon, TrashIcon, XMarkIcon, CheckIcon, PlusIcon, EyeIcon, TicketIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

// Komponen Notifikasi
function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle = "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 animate-slide-in";
  const typeStyle = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    <div className={`${baseStyle} ${typeStyle}`}>
      {message}
    </div>
  );
}

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states penjualan
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("");
  const [buyerName, setBuyerName] = useState("");

  // Modal states
  const [modalDelete, setModalDelete] = useState({ isOpen: false, type: "", id: null });
  const [modalDetail, setModalDetail] = useState({ isOpen: false, product: null });
  const [modalInvoice, setModalInvoice] = useState({ isOpen: false, saleDetails: null });

  // Filter waktu dan produk
  const [filter, setFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);

  // Total pendapatan
  const [totalRevenue, setTotalRevenue] = useState(0);

  // State edit & tambah stok produk
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", stock: "", price: "", category: "" });
  const [addingStockId, setAddingStockId] = useState(null);
  const [addedStockQty, setAddedStockQty] = useState("");
  
  // Real-time listener
  useEffect(() => {
    setLoading(true);
    const productsQuery = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setNotification({ type: "error", message: "Gagal mengambil produk." });
      setLoading(false);
    });

    return () => unsubscribeProducts();
  }, []);

  useEffect(() => {
    let salesQuery;
    const now = new Date();
    if (filter === "thisWeek") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
        salesQuery = query(collection(db, "sales"), where("soldAt", ">=", startDate), orderBy("soldAt", "desc"));
    } else if (filter === "thisMonth") {
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        salesQuery = query(collection(db, "sales"), where("soldAt", ">=", startDate), orderBy("soldAt", "desc"));
    } else {
        salesQuery = query(collection(db, "sales"), orderBy("soldAt", "desc"));
    }
    
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setSales(items);
    }, (err) => {
        console.error(err);
        setNotification({ type: "error", message: "Gagal mengambil penjualan." });
    });

    return () => unsubscribeSales();
  }, [filter]);

  // Kalkulasi total pendapatan
  useEffect(() => {
    const total = sales.reduce((sum, sale) => {
        const product = products.find(p => p.id === sale.productId);
        return sum + (product ? sale.qty * product.price : 0);
    }, 0);
    setTotalRevenue(total);
  }, [sales, products]);

  // Fungsi notifikasi
  const showNotification = (type, message) => {
    setNotification({ type, message });
  };

  const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);

  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "-";
    return timestamp.toDate().toLocaleString("id-ID", {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Fungsi untuk membuka modal struk/invoice
  const openInvoiceModal = (sale) => {
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      setModalInvoice({
        isOpen: true,
        saleDetails: { ...sale, productName: product.name, price: product.price }
      });
    } else {
      showNotification('error', 'Detail produk untuk struk tidak ditemukan.');
    }
  };

  // Fungsi untuk mengirim pesan WhatsApp
  const sendWhatsAppMessage = () => {
    const { saleDetails } = modalInvoice;
    if (!saleDetails) return;

    const totalPrice = saleDetails.qty * saleDetails.price;
    const message = `*Struk Pembelian Jeyo Store* 🧾
-----------------------------------
Produk: *${saleDetails.productName}*
Jumlah: *${saleDetails.qty}*
Total Harga: *${formatRupiah(totalPrice)}*
Pembeli: ${saleDetails.buyerName || '-'}
Tanggal: ${formatTimestamp(saleDetails.soldAt)}
-----------------------------------
Terima kasih telah berbelanja! 🙏`;

    const whatsappUrl = `https://wa.me/6289699335843?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  async function handleSale(e) {
    e.preventDefault();
    if (!saleProductId || !saleQty || Number(saleQty) <= 0) {
      return showNotification("error", "Pilih produk dan isi jumlah dengan benar.");
    }
    const product = products.find((p) => p.id === saleProductId);
    if (!product || product.stock < Number(saleQty)) {
      return showNotification("error", `Stok tidak cukup. Stok tersedia: ${product?.stock || 0}`);
    }

    setLoading(true);
    const saleData = {
      productId: saleProductId,
      qty: Number(saleQty),
      buyerName: buyerName.trim(),
      soldAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "sales"), saleData);
      const productRef = doc(db, "products", saleProductId);
      await updateDoc(productRef, { stock: product.stock - Number(saleQty) });
      
      showNotification("success", "Penjualan berhasil dicatat!");
      openInvoiceModal({
        ...saleData, 
        soldAt: new Date(),
        productName: product.name,
        price: product.price,
      });

      setSaleProductId("");
      setSaleQty("");
      setBuyerName("");
    } catch (err) {
      showNotification("error", "Gagal mencatat penjualan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(type, id) {
    setModalDelete({ isOpen: false, type: "", id: null });
    setLoading(true);
    try {
        if (type === "sale") {
            const saleRef = doc(db, "sales", id);
            const saleSnap = await getDoc(saleRef);
            const saleData = saleSnap.data();
            if (saleData) {
                const productRef = doc(db, "products", saleData.productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    await updateDoc(productRef, { stock: productSnap.data().stock + saleData.qty });
                }
            }
            await deleteDoc(saleRef);
            showNotification("success", "Penjualan berhasil dihapus.");
        } else if (type === "product") {
            await deleteDoc(doc(db, "products", id));
            showNotification("success", "Produk berhasil dihapus.");
        }
    } catch (err) {
      showNotification("error", `Gagal menghapus ${type}.`);
    } finally {
      setLoading(false);
    }
  }
  
  function startEdit(product) {
    setEditingProductId(product.id);
    setEditForm({ 
        name: product.name || "", 
        stock: product.stock || 0, 
        price: product.price || 0,
        category: product.category || "",
    });
  }

  function cancelEdit() {
    setEditingProductId(null);
  }

  async function saveEdit(id) {
    if (!editForm.name.trim() || !editForm.stock.toString().trim() || !editForm.price.toString().trim()) {
        return showNotification("error", "Nama, stok, dan harga harus diisi.");
    }
    setLoading(true);
    try {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, { 
        name: editForm.name,
        stock: Number(editForm.stock),
        price: Number(editForm.price),
        category: editForm.category,
      });
      cancelEdit();
      showNotification("success", "Produk berhasil diperbarui.");
    } catch (err) {
      showNotification("error", "Gagal menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  }

  function startAddStock(id) {
    setAddingStockId(id);
    setAddedStockQty("");
  }

  function cancelAddStock() {
    setAddingStockId(null);
    setAddedStockQty("");
  }

  async function saveAddStock(id) {
    if (!addedStockQty || Number(addedStockQty) <= 0) {
        return showNotification("error", "Jumlah stok tidak valid.");
    }
    setLoading(true);
    try {
      const product = products.find(p => p.id === id);
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        stock: product.stock + Number(addedStockQty),
        lastStockAddedAt: serverTimestamp(),
        lastStockAddedQty: Number(addedStockQty),
      });
      cancelAddStock();
      showNotification("success", "Stok berhasil ditambahkan.");
    } catch (err) {
      showNotification("error", "Gagal menambah stok.");
    } finally {
      setLoading(false);
    }
  }

  const toggleProductVisibility = async (product) => {
    setLoading(true);
    try {
        const productRef = doc(db, "products", product.id);
        await updateDoc(productRef, {
            isHidden: !product.isHidden
        });
        showNotification("success", `Produk ${product.isHidden ? 'ditampilkan' : 'disembunyikan'}.`);
    } catch (err) {
        showNotification("error", "Gagal mengubah status produk.");
    } finally {
        setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => showHidden || !product.isHidden);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Daftar Produk & Penjualan</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Tambah Penjualan Baru</h2>
        <form onSubmit={handleSale} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">Produk</label>
                <select value={saleProductId} onChange={(e) => setSaleProductId(e.target.value)} disabled={loading} className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required>
                    <option value="">Pilih Produk</option>
                    {products.filter(p => !p.isHidden).map((p) => (<option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>))}
                </select>
            </div>
            <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">Jumlah</label>
                <input type="number" min="1" placeholder="Jumlah" value={saleQty} onChange={(e) => setSaleQty(e.target.value)} disabled={loading} className="p-2 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600" required />
            </div>
            <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300">Catatan Pembeli (Opsional)</label>
                <input type="text" placeholder="Nama, nomor, dll." value={buyerName} onChange={(e) => setBuyerName(e.target.value)} disabled={loading} className="p-2 border rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full">
                Catat Penjualan
            </button>
        </form>
      </div>

      {/* Tampilan Manajemen Produk */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Manajemen Produk</h2>
            <div className="flex items-center gap-2">
                <label htmlFor="showHidden" className="text-sm font-medium text-gray-600 dark:text-gray-300">Tampilkan Tersembunyi</label>
                <input type="checkbox" id="showHidden" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            </div>
        </div>
        {/* Tampilan Tabel untuk Desktop */}
        <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nama Produk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stok</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Harga</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Update Terakhir</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.map((product) => (
                        editingProductId === product.id ? (
                          <tr key={`${product.id}-edit`} className="bg-yellow-50 dark:bg-yellow-900/20">
                              <td className="px-6 py-4"><input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="p-1 border rounded w-full bg-gray-50 dark:bg-gray-700" /></td>
                              <td className="px-6 py-4"><input type="text" value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="p-1 border rounded w-full bg-gray-50 dark:bg-gray-700" /></td>
                              <td className="px-6 py-4"><input type="number" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: e.target.value})} className="p-1 border rounded w-full bg-gray-50 dark:bg-gray-700" /></td>
                              <td className="px-6 py-4"><input type="number" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} className="p-1 border rounded w-full bg-gray-50 dark:bg-gray-700" /></td>
                              <td className="px-6 py-4"></td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => saveEdit(product.id)} className="text-green-500 hover:text-green-700" title="Simpan"><CheckIcon className="h-5 w-5"/></button>
                                      <button onClick={cancelEdit} className="text-red-500 hover:text-red-700" title="Batal"><XMarkIcon className="h-5 w-5" /></button>
                                  </div>
                              </td>
                          </tr>
                        ) : (
                          <tr key={product.id} className={product.isHidden ? 'opacity-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{product.category || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span>{product.stock}</span>
                                  {addingStockId === product.id ? (
                                    <div className="flex items-center gap-1">
                                      <input type="number" min="1" value={addedStockQty} onChange={e => setAddedStockQty(e.target.value)} className="p-1 border rounded w-16 bg-gray-50 dark:bg-gray-700" placeholder="+"/>
                                      <button onClick={() => saveAddStock(product.id)} className="text-green-500 hover:text-green-700"><CheckIcon className="h-5 w-5"/></button>
                                      <button onClick={cancelAddStock} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-5 w-5"/></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => startAddStock(product.id)} className="text-gray-400 hover:text-green-600" title="Tambah Stok"><PlusIcon className="h-5 w-5"/></button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{formatRupiah(product.price)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {product.lastStockAddedAt ? (
                                  <>
                                    {formatTimestamp(product.lastStockAddedAt)}
                                    {product.lastStockAddedQty && <span className="text-green-600 font-bold ml-1">(+{product.lastStockAddedQty})</span>}
                                  </>
                                ) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-3">
                                      <button onClick={() => toggleProductVisibility(product)} className="text-gray-400 hover:text-yellow-600" title={product.isHidden ? "Tampilkan Produk" : "Sembunyikan Produk"}>{product.isHidden ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button>
                                      <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-blue-600" title="Edit Produk"><PencilIcon className="h-5 w-5" /></button>
                                      <button onClick={() => setModalDelete({ isOpen: true, type: "product", id: product.id })} className="text-gray-400 hover:text-red-600" title="Hapus Produk"><TrashIcon className="h-5 w-5" /></button>
                                  </div>
                              </td>
                          </tr>
                        )
                    ))}
                </tbody>
            </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredProducts.map(product => (
                <div key={product.id} className={`bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm ${product.isHidden ? 'opacity-50' : ''}`}>
                  {editingProductId === product.id ? (
                      <div className="space-y-3">
                          <input type="text" placeholder="Nama Produk" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="p-2 border rounded w-full bg-white dark:bg-gray-600" />
                          <input type="text" placeholder="Kategori" value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="p-2 border rounded w-full bg-white dark:bg-gray-600" />
                          <input type="number" placeholder="Stok" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: e.target.value})} className="p-2 border rounded w-full bg-white dark:bg-gray-600" />
                          <input type="number" placeholder="Harga" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} className="p-2 border rounded w-full bg-white dark:bg-gray-600" />
                          <div className="flex items-center gap-3 mt-2">
                              <button onClick={() => saveEdit(product.id)} className="text-green-500 hover:text-green-700" title="Simpan"><CheckIcon className="h-5 w-5"/></button>
                              <button onClick={cancelEdit} className="text-red-500 hover:text-red-700" title="Batal"><XMarkIcon className="h-5 w-5" /></button>
                          </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">{product.name}</h3>
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full dark:bg-indigo-900 dark:text-indigo-300">{product.category || 'N/A'}</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                                <p><strong>Stok:</strong> {product.stock}</p>
                                {addingStockId === product.id ? (
                                    <div className="flex items-center gap-1">
                                        <input type="number" min="1" value={addedStockQty} onChange={e => setAddedStockQty(e.target.value)} className="p-1 border rounded w-16 bg-white dark:bg-gray-600" placeholder="+"/>
                                        <button onClick={() => saveAddStock(product.id)} className="text-green-500"><CheckIcon className="h-5 w-5"/></button>
                                        <button onClick={cancelAddStock} className="text-red-500"><XMarkIcon className="h-5 w-5"/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => startAddStock(product.id)} className="text-gray-500 hover:text-green-600 text-xs flex items-center gap-1" title="Tambah Stok"><PlusIcon className="h-4 w-4"/>Stok</button>
                                )}
                            </div>
                            <p><strong>Harga:</strong> {formatRupiah(product.price)}</p>
                            {product.lastStockAddedAt && (
                                <p className="text-xs text-gray-500">
                                    <strong>Update:</strong> {formatTimestamp(product.lastStockAddedAt)}
                                    {product.lastStockAddedQty && <span className="text-green-600 font-bold ml-1">(+{product.lastStockAddedQty})</span>}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <button onClick={() => toggleProductVisibility(product)} className="text-gray-500 hover:text-yellow-600" title={product.isHidden ? "Tampilkan" : "Sembunyikan"}>{product.isHidden ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button>
                            <button onClick={() => startEdit(product)} className="text-gray-500 hover:text-blue-600" title="Edit"><PencilIcon className="h-5 w-5" /></button>
                            <button onClick={() => setModalDelete({ isOpen: true, type: "product", id: product.id })} className="text-gray-500 hover:text-red-600" title="Hapus"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                      </>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Tampilan Riwayat Penjualan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Riwayat Penjualan</h2>
            <select className="border p-2 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Semua Waktu</option>
                <option value="thisWeek">Minggu Ini</option>
                <option value="thisMonth">Bulan Ini</option>
            </select>
        </div>
        <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Produk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jumlah</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pembeli</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Harga</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sales.map((sale) => {
                        const product = products.find((p) => p.id === sale.productId);
                        return (
                        <tr key={sale.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{product ? product.name : "Produk Dihapus"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{sale.qty}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{sale.buyerName || "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{product ? formatRupiah(sale.qty * product.price) : "-"}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{formatTimestamp(sale.soldAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => openInvoiceModal(sale)} className="text-gray-400 hover:text-green-600" title="Cetak Struk"><TicketIcon className="h-5 w-5" /></button>
                                  <button onClick={() => setModalDelete({ isOpen: true, type: "sale", id: sale.id })} className="text-gray-400 hover:text-red-600" title="Hapus Penjualan"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {sales.map(sale => {
                const product = products.find(p => p.id === sale.productId);
                return (
                    <div key={sale.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-2">{product ? product.name : "Produk Dihapus"}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <p><strong>Jumlah:</strong> {sale.qty}</p>
                            <p><strong>Total:</strong> {product ? formatRupiah(sale.qty * product.price) : "-"}</p>
                            <p><strong>Pembeli:</strong> {sale.buyerName || "-"}</p>
                            <p><strong>Tanggal:</strong> {formatTimestamp(sale.soldAt)}</p>
                        </div>
                        <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                           <button onClick={() => openInvoiceModal(sale)} className="text-gray-500 hover:text-green-600" title="Cetak Struk"><TicketIcon className="h-5 w-5" /></button>
                           <button onClick={() => setModalDelete({ isOpen: true, type: "sale", id: sale.id })} className="text-gray-500 hover:text-red-600" title="Hapus Penjualan"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                );
            })}
        </div>
        <div className="mt-4 text-right font-bold text-lg text-gray-800 dark:text-white">Total Pendapatan: {formatRupiah(totalRevenue)}</div>
      </div>

      {modalInvoice.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-center">Struk Pembelian</h3>
                <div className="border-t border-b border-dashed py-4 my-4 space-y-2 text-sm">
                  <p><strong>Produk:</strong> {modalInvoice.saleDetails?.productName}</p>
                  <p><strong>Jumlah:</strong> {modalInvoice.saleDetails?.qty}</p>
                  <p><strong>Total Harga:</strong> {formatRupiah(modalInvoice.saleDetails?.qty * modalInvoice.saleDetails?.price)}</p>
                  <p><strong>Pembeli:</strong> {modalInvoice.saleDetails?.buyerName || '-'}</p>
                  <p><strong>Tanggal:</strong> {formatTimestamp(modalInvoice.saleDetails?.soldAt)}</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={sendWhatsAppMessage} className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        Kirim via WhatsApp
                    </button>
                    <button onClick={() => setModalInvoice({ isOpen: false, saleDetails: null })} className="w-full bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {modalDetail.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl relative">
                <button onClick={() => setModalDetail({ isOpen: false, product: null })} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{modalDetail.product.name}</h3>
                <img src={modalDetail.product.imageUrl || 'https://placehold.co/600x400/667eea/ffffff?text=Jeyo+Store'} alt={modalDetail.product.name} className="w-full h-48 object-cover rounded-md mb-4"/>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong className="font-medium text-gray-800 dark:text-gray-100">Harga:</strong> {formatRupiah(modalDetail.product.price)}</p>
                    <p><strong className="font-medium text-gray-800 dark:text-gray-100">Stok Tersedia:</strong> {modalDetail.product.stock}</p>
                    <p><strong className="font-medium text-gray-800 dark:text-gray-100">Kategori:</strong> {modalDetail.product.category || 'Tidak ada kategori'}</p>
                    <p><strong className="font-medium text-gray-800 dark:text-gray-100">Terakhir Tambah Stok:</strong> 
                        {' '}{formatTimestamp(modalDetail.product.lastStockAddedAt)}
                        {modalDetail.product.lastStockAddedQty && <span className="text-green-600 font-bold ml-1">(+{modalDetail.product.lastStockAddedQty})</span>}
                    </p>
                </div>
            </div>
        </div>
      )}
      
      {modalDelete.isOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-lg font-bold mb-4">Konfirmasi Hapus</h3>
                <p className="mb-6">Apakah Anda yakin ingin menghapus {modalDelete.type === "product" ? "produk ini" : "penjualan ini"}?</p>
                <div className="flex justify-end gap-4">
                    <button onClick={() => setModalDelete({ isOpen: false, type: "", id: null })} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Batal</button>
                    <button onClick={() => handleDelete(modalDelete.type, modalDelete.id)} disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Hapus</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
