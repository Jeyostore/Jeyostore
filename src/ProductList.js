import React, { useEffect, useState, useCallback } from "react";
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
  onSnapshot,
} from "firebase/firestore";
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  EyeIcon,
  TicketIcon,
  EyeSlashIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import ClipLoader from "react-spinners/ClipLoader";

// Komponen Notifikasi
function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseStyle =
    "fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 animate-slide-in transition-all duration-300 ease-out";
  const typeStyle = type === "success" ? "bg-green-500" : "bg-red-500";

  return <div className={`${baseStyle} ${typeStyle}`}>{message}</div>;
}

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states penjualan baru
  const [saleForm, setSaleForm] = useState({
    productId: "",
    qty: "",
    buyerName: "",
    customerType: "non-reseller", // Default: lowercase
  });

  // Modal states
  const [modalDelete, setModalDelete] = useState({
    isOpen: false,
    type: "",
    id: null,
  });
  const [modalDetail, setModalDetail] = useState({
    isOpen: false,
    product: null,
  });
  const [modalInvoice, setModalInvoice] = useState({
    isOpen: false,
    saleDetails: null,
  });

  // Filter waktu dan produk
  const [timeFilter, setTimeFilter] = useState("all");
  const [showHiddenProducts, setShowHiddenProducts] = useState(false);

  // Total pendapatan
  const [totalRevenue, setTotalRevenue] = useState(0);

  // State edit & tambah stok produk
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    name: "",
    stock: "",
    price: "",
    category: "",
  });
  const [addingStockId, setAddingStockId] = useState(null);
  const [addedStockQty, setAddedStockQty] = useState("");

  // STATE UNTUK EDIT PENJUALAN
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editSaleForm, setEditSaleForm] = useState({
    customerType: "",
    buyerName: "",
    productCategory: "",
  });

  // STATE UNTUK FILTER PENJUALAN LANJUTAN
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");

  // Fungsi untuk menampilkan notifikasi
  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
  }, []);

  // Format Rupiah
  const formatRupiah = useCallback(
    (number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(number),
    []
  );

  // Fungsi untuk mengonversi string ke format "Huruf Awal Kapital" (untuk tampilan)
  // Menyesuaikan "non-reseller" dan "reseller" agar selalu ditampilkan dengan benar
  const capitalizeForDisplay = useCallback((string) => {
    if (!string) return "";
    const lowerString = string.toLowerCase();
    if (lowerString === "non-reseller") return "Non-Reseller";
    if (lowerString === "reseller") return "Reseller";
    return lowerString.charAt(0).toUpperCase() + lowerString.slice(1);
  }, []);

  // Format Timestamp
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp?.toDate) return "-";
    return timestamp.toDate().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Real-time listener untuk produk
  useEffect(() => {
    setLoading(true);
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name", "asc")
    );
    const unsubscribeProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        showNotification("error", "Gagal mengambil produk.");
        setLoading(false);
      }
    );

    return () => unsubscribeProducts();
  }, [showNotification]);

  // Real-time listener untuk penjualan (dengan filter waktu dan kategori)
  useEffect(() => {
    let salesRef = collection(db, "sales");
    let q = query(salesRef);

    const now = new Date();
    let startDate;

    // Filter berdasarkan waktu
    if (timeFilter === "thisWeek") {
      const day = now.getDay(); // 0 = Minggu, 1 = Senin, dst.
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Sesuaikan ke Senin
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      startDate.setHours(0, 0, 0, 0); // Atur ke awal hari
      q = query(q, where("soldAt", ">=", startDate));
    } else if (timeFilter === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0); // Atur ke awal hari
      q = query(q, where("soldAt", ">=", startDate));
    }

    // Filter berdasarkan kategori pembeli (harus lowercase)
    if (customerTypeFilter !== "all") {
      q = query(q, where("customerType", "==", customerTypeFilter));
    }

    // Filter berdasarkan kategori produk (harus lowercase)
    if (productCategoryFilter !== "all") {
      q = query(q, where("productCategory", "==", productCategoryFilter));
    }

    q = query(q, orderBy("soldAt", "desc"));

    const unsubscribeSales = onSnapshot(
      q,
      (snapshot) => {
        let items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSales(items);
      },
      (err) => {
        console.error("Error fetching sales:", err);
        showNotification("error", "Gagal mengambil penjualan.");
      }
    );

    return () =>
      unsubscribeSales();
  }, [timeFilter, customerTypeFilter, productCategoryFilter, showNotification]);

  // Kalkulasi total pendapatan
  useEffect(() => {
    const total = sales.reduce((sum, sale) => {
      const product = products.find((p) => p.id === sale.productId);
      return sum + (sale.qty * (sale.price || product?.price || 0));
    }, 0);
    setTotalRevenue(total);
  }, [sales, products]);

  // Fungsi untuk membuka modal struk/invoice
  const openInvoiceModal = useCallback(
    (sale) => {
      const product = products.find((p) => p.id === sale.productId);
      setModalInvoice({
        isOpen: true,
        saleDetails: {
          ...sale,
          // Menggunakan data dari produk master jika tersedia, fallback ke data sale
          productName: product?.name || sale.productName || "Produk Dihapus",
          price: product?.price || sale.price || 0,
          productCategory: sale.productCategory || "tidak diketahui", // Pastikan lowercase untuk konsistensi
        },
      });
    },
    [products] // products diperlukan untuk fallback jika productName/price tidak ada di sale
  );

  // Fungsi untuk mengirim pesan WhatsApp
  const sendWhatsAppMessage = useCallback(() => {
    const { saleDetails } = modalInvoice;
    if (!saleDetails) return;

    const totalPrice = saleDetails.qty * saleDetails.price;
    const message = `*Struk Pembelian Jeyo Store* 🧾
-----------------------------------
Produk: *${saleDetails.productName}*
Kategori Produk: *${capitalizeForDisplay(saleDetails.productCategory)}*
Jumlah: *${saleDetails.qty}*
Total Harga: *${formatRupiah(totalPrice)}*
Pembeli: ${saleDetails.buyerName || "-"}
Kategori Pembeli: *${capitalizeForDisplay(saleDetails.customerType)}*
Tanggal: ${formatTimestamp(saleDetails.soldAt)}
-----------------------------------
Terima kasih telah berbelanja! 🙏`;

    const whatsappUrl = `https://wa.me/6289699335843?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  }, [modalInvoice, formatRupiah, formatTimestamp, capitalizeForDisplay]);

  // Handle Penjualan Baru
  async function handleSale(e) {
    e.preventDefault();
    const { productId, qty, buyerName, customerType } = saleForm;

    if (!productId || Number(qty) <= 0) {
      return showNotification(
        "error",
        "Pilih produk dan isi jumlah dengan benar."
      );
    }

    const product = products.find((p) => p.id === productId);
    if (!product || product.stock < Number(qty)) {
      return showNotification(
        "error",
        `Stok tidak cukup. Stok tersedia: ${product?.stock || 0}`
      );
    }

    setLoading(true);
    const saleData = {
      productId,
      qty: Number(qty),
      buyerName: buyerName.trim(),
      customerType: customerType.toLowerCase(), // Simpan lowercase
      soldAt: serverTimestamp(),
      productCategory: (product.category || "tidak diketahui").toLowerCase(), // Simpan lowercase
      productName: product.name, // Simpan nama produk saat penjualan agar tetap ada jika produk dihapus
      price: product.price, // Simpan harga produk saat penjualan agar tetap ada jika produk dihapus
    };
    try {
      await addDoc(collection(db, "sales"), saleData);
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, { stock: product.stock - Number(qty) });

      showNotification("success", "Penjualan berhasil dicatat!");
      // Buka modal invoice dengan data penjualan yang baru
      openInvoiceModal({
        ...saleData,
        soldAt: new Date(), // Gunakan tanggal lokal untuk tampilan struk
      });

      // Reset form
      setSaleForm({
        productId: "",
        qty: "",
        buyerName: "",
        customerType: "non-reseller",
      });
    } catch (err) {
      console.error("Error recording sale:", err);
      showNotification("error", "Gagal mencatat penjualan.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Hapus Produk atau Penjualan
  async function handleDelete(type, id) {
    setModalDelete({ isOpen: false, type: "", id: null }); // Tutup modal konfirmasi
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
            await updateDoc(productRef, {
              stock: productSnap.data().stock + saleData.qty,
            });
          }
        }
        await deleteDoc(saleRef);
        showNotification("success", "Penjualan berhasil dihapus.");
      } else if (type === "product") {
        await deleteDoc(doc(db, "products", id));
        showNotification("success", "Produk berhasil dihapus.");
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      showNotification("error", `Gagal menghapus ${type}.`);
    } finally {
      setLoading(false);
    }
  }

  // Edit Produk
  const startEdit = useCallback((product) => {
    setEditingProductId(product.id);
    setEditProductForm({
      name: product.name || "",
      stock: product.stock || 0,
      price: product.price || 0,
      category: product.category || "",
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingProductId(null);
    setEditProductForm({ name: "", stock: "", price: "", category: "" });
  }, []);

  async function saveEdit(id) {
    if (
      !editProductForm.name.trim() ||
      !editProductForm.stock.toString().trim() ||
      !editProductForm.price.toString().trim()
    ) {
      return showNotification("error", "Nama, stok, dan harga harus diisi.");
    }
    setLoading(true);
    try {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        name: editProductForm.name,
        stock: Number(editProductForm.stock),
        price: Number(editProductForm.price),
        category: editProductForm.category.trim().toLowerCase(), // Simpan lowercase
      });
      cancelEdit();
      showNotification("success", "Produk berhasil diperbarui.");
    } catch (err) {
      console.error("Error saving product edit:", err);
      showNotification("error", "Gagal menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  }

  // Tambah Stok
  const startAddStock = useCallback((id) => {
    setAddingStockId(id);
    setAddedStockQty("");
  }, []);

  const cancelAddStock = useCallback(() => {
    setAddingStockId(null);
    setAddedStockQty("");
  }, []);

  async function saveAddStock(id) {
    if (!addedStockQty || Number(addedStockQty) <= 0) {
      return showNotification("error", "Jumlah stok tidak valid.");
    }
    setLoading(true);
    try {
      const product = products.find((p) => p.id === id);
      if (!product) {
        throw new Error("Product not found.");
      }
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, {
        stock: product.stock + Number(addedStockQty),
        lastStockAddedAt: serverTimestamp(),
        lastStockAddedQty: Number(addedStockQty),
      });
      cancelAddStock();
      showNotification("success", "Stok berhasil ditambahkan.");
    } catch (err) {
      console.error("Error adding stock:", err);
      showNotification("error", "Gagal menambah stok.");
    } finally {
      setLoading(false);
    }
  }

  // Mengubah visibilitas produk
  const toggleProductVisibility = async (product) => {
    setLoading(true);
    try {
      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, {
        isHidden: !product.isHidden,
      });
      showNotification(
        "success",
        `Produk ${product.isHidden ? "ditampilkan" : "disembunyikan"}.`
      );
    } catch (err) {
      console.error("Error toggling product visibility:", err);
      showNotification("error", "Gagal mengubah status produk.");
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI UNTUK EDIT PENJUALAN
  const startEditSale = useCallback(
    (sale) => {
      setEditingSaleId(sale.id);
      setEditSaleForm({
        customerType: sale.customerType?.toLowerCase() || "non-reseller",
        buyerName: sale.buyerName || "",
        productCategory: (sale.productCategory || "tidak diketahui").toLowerCase(), // Pastikan lowercase
      });
    },
    []
  );

  const cancelEditSale = useCallback(() => {
    setEditingSaleId(null);
    setEditSaleForm({ customerType: "", buyerName: "", productCategory: "" });
  }, []);

  async function saveEditSale(saleId) {
    setLoading(true);
    try {
      const saleRef = doc(db, "sales", saleId);
      const dataToUpdate = {
        customerType: editSaleForm.customerType.toLowerCase(),
        buyerName: editSaleForm.buyerName.trim(),
        productCategory: (editSaleForm.productCategory || "tidak diketahui").trim().toLowerCase(), // Tambahkan fallback di sini
      };

      console.log("Attempting to save sale with data:", dataToUpdate); // DEBUG: Tambahkan ini untuk melihat data sebelum dikirim

      await updateDoc(saleRef, dataToUpdate);
      cancelEditSale();
      showNotification("success", "Penjualan berhasil diperbarui.");
    } catch (err) {
      console.error("Error saving sale edit:", err);
      showNotification("error", "Gagal menyimpan perubahan penjualan.");
    } finally {
      setLoading(false);
    }
  }

  // Filter produk berdasarkan showHiddenProducts state
  const filteredProducts = products.filter(
    (product) => showHiddenProducts || !product.isHidden
  );

  // Logika pengumpulan kategori unik yang memastikan tidak ada duplikasi
  const allUniqueCategoriesSet = new Set();
  products.forEach(p => {
    if (p.category) allUniqueCategoriesSet.add(p.category.toLowerCase());
  });
  sales.forEach(s => {
    if (s.productCategory) allUniqueCategoriesSet.add(s.productCategory.toLowerCase());
  });

  const allUniqueCategories = Array.from(allUniqueCategoriesSet).sort();


  // Opsi untuk dropdown filter kategori produk
  const productCategoryFilterOptions = [
    "all", // Opsi 'Semua Kategori Produk'
    ...allUniqueCategories, // Sudah diurutkan
  ];

  // Opsi untuk dropdown edit kategori produk di penjualan (tidak ada 'all')
  const editProductCategoryOptions = [...allUniqueCategories];
  // Menambahkan kategori dari penjualan yang sedang diedit ke daftar jika belum ada di allUniqueCategories
  if (editingSaleId && editSaleForm.productCategory) {
    const currentSaleCategoryLower = editSaleForm.productCategory.toLowerCase();
    if (!editProductCategoryOptions.includes(currentSaleCategoryLower)) {
      editProductCategoryOptions.push(currentSaleCategoryLower);
      editProductCategoryOptions.sort(); // Urutkan lagi setelah penambahan
    }
  }
  // Tambahkan 'tidak diketahui' jika belum ada (gunakan lowercase untuk konsistensi internal)
  if (!editProductCategoryOptions.includes('tidak diketahui')) {
    editProductCategoryOptions.push('tidak diketahui');
    editProductCategoryOptions.sort(); // Urutkan lagi jika 'tidak diketahui' ditambahkan
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <ClipLoader color="#4F46E5" loading={loading} size={50} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Daftar Produk & Penjualan
      </h1>

      {/* Bagian Catat Penjualan Baru */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl mb-8 transition-all duration-300">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
          Catat Penjualan Baru
        </h2>
        <form
          onSubmit={handleSale}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
        >
          <div className="flex flex-col">
            <label
              htmlFor="saleProduct"
              className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Produk
            </label>
            <select
              id="saleProduct"
              value={saleForm.productId}
              onChange={(e) =>
                setSaleForm({ ...saleForm, productId: e.target.value })
              }
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            >
              <option value="">Pilih Produk</option>
              {products
                .filter((p) => !p.isHidden)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stok: {p.stock})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="saleQty"
              className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Jumlah
            </label>
            <input
              id="saleQty"
              type="number"
              min="1"
              placeholder="Jumlah"
              value={saleForm.qty}
              onChange={(e) =>
                setSaleForm({ ...saleForm, qty: e.target.value })
              }
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="buyerName"
              className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Nama Pembeli (Opsional)
            </label>
            <input
              id="buyerName"
              type="text"
              placeholder="Nama, nomor, dll."
              value={saleForm.buyerName}
              onChange={(e) =>
                setSaleForm({ ...saleForm, buyerName: e.target.value })
              }
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="customerType"
              className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Kategori Pembeli
            </label>
            <select
              id="customerType"
              value={saleForm.customerType}
              onChange={(e) =>
                setSaleForm({ ...saleForm, customerType: e.target.value })
              }
              disabled={loading}
              className="p-2 border border-gray-300 rounded-lg w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
            >
              <option value="non-reseller">Non-Reseller</option>
              <option value="reseller">Reseller</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-5 w-5" /> Catat Penjualan
          </button>
        </form>
      </div>

      {/* Tampilan Manajemen Produk */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl mb-8 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Manajemen Produk
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showHidden"
              checked={showHiddenProducts}
              onChange={(e) => setShowHiddenProducts(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 transition-colors"
            />
            <label
              htmlFor="showHidden"
              className="text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Tampilkan Produk Tersembunyi
            </label>
          </div>
        </div>
        {/* Tampilan Tabel untuk Desktop (tetap sama) */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 hidden md:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nama Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Update Terakhir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) =>
                editingProductId === product.id ? (
                  <tr
                    key={`${product.id}-edit`}
                    className="bg-yellow-50 dark:bg-yellow-900/20 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editProductForm.name}
                        onChange={(e) =>
                          setEditProductForm({
                            ...editProductForm,
                            name: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editProductForm.category}
                        onChange={(e) =>
                          setEditProductForm({
                            ...editProductForm,
                            category: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={editProductForm.stock}
                        onChange={(e) =>
                          setEditProductForm({
                            ...editProductForm,
                            stock: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={editProductForm.price}
                        onChange={(e) =>
                          setEditProductForm({
                            ...editProductForm,
                            price: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(product.id)}
                          className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title="Simpan"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Batal"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={product.id}
                    className={product.isHidden ? "opacity-50" : "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.category || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{product.stock}</span>
                        {addingStockId === product.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={addedStockQty}
                              onChange={(e) => setAddedStockQty(e.target.value)}
                              className="p-1 border border-gray-300 rounded w-16 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              placeholder="+"
                            />
                            <button
                              onClick={() => saveAddStock(product.id)}
                              className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelAddStock}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startAddStock(product.id)}
                            className="text-gray-500 hover:text-green-600 text-xs flex items-center gap-1 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            title="Tambah Stok"
                          >
                            <PlusIcon className="h-4 w-4" />Stok
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatRupiah(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {product.lastStockAddedAt ? (
                        <>
                          {formatTimestamp(product.lastStockAddedAt)}
                          {product.lastStockAddedQty && (
                            <span className="text-green-600 font-bold ml-1">
                              (+{product.lastStockAddedQty})
                            </span>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setModalDetail({ isOpen: true, product: product })
                          }
                          className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Detail Produk"
                        >
                          <InformationCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => toggleProductVisibility(product)}
                          className="text-gray-500 hover:text-yellow-600 p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                          title={
                            product.isHidden
                              ? "Tampilkan Produk"
                              : "Sembunyikan Produk"
                          }
                        >
                          {product.isHidden ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(product)}
                          className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit Produk"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            setModalDelete({
                              isOpen: true,
                              type: "product",
                              id: product.id,
                            })
                          }
                          className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Hapus Produk"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {/* Tampilan Card untuk Mobile (diperbaiki) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm ${product.isHidden ? "opacity-50" : ""} transition-all duration-200 ${editingProductId === product.id ? "border-2 border-yellow-400" : ""}`}
            >
              {editingProductId === product.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nama Produk"
                    value={editProductForm.name}
                    onChange={(e) =>
                      setEditProductForm({
                        ...editProductForm,
                        name: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Kategori"
                    value={editProductForm.category}
                    onChange={(e) =>
                      setEditProductForm({
                        ...editProductForm,
                        category: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <input
                    type="number"
                    placeholder="Stok"
                    value={editProductForm.stock}
                    onChange={(e) =>
                      setEditProductForm({
                        ...editProductForm,
                        stock: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <input
                    type="number"
                    placeholder="Harga"
                    value={editProductForm.price}
                    onChange={(e) =>
                      setEditProductForm({
                        ...editProductForm,
                        price: e.target.value,
                      })
                    }
                    className="p-2 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => saveEdit(product.id)}
                      className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="Simpan"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Batal"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                      {product.name}
                    </h3>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                      {capitalizeForDisplay(product.category) || "N/A"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <p>
                        <strong>Stok:</strong> {product.stock}
                      </p>
                      {addingStockId === product.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={addedStockQty}
                            onChange={(e) => setAddedStockQty(e.target.value)}
                            className="p-1 border border-gray-300 rounded w-16 bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="+"
                          />
                          <button
                            onClick={() => saveAddStock(product.id)}
                            className="text-green-500 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelAddStock}
                            className="text-red-500 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startAddStock(product.id)}
                          className="text-gray-500 hover:text-green-600 text-xs flex items-center gap-1 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title="Tambah Stok"
                        >
                          <PlusIcon className="h-4 w-4" />Stok
                        </button>
                      )}
                    </div>
                    <p>
                      <strong>Harga:</strong> {formatRupiah(product.price)}
                    </p>
                    {product.lastStockAddedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Update:</strong>{" "}
                        {formatTimestamp(product.lastStockAddedAt)}
                        {product.lastStockAddedQty && (
                          <span className="text-green-600 font-bold ml-1">
                            (+{product.lastStockAddedQty})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() =>
                        setModalDetail({ isOpen: true, product: product })
                      }
                      className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Detail"
                    >
                      <InformationCircleIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => toggleProductVisibility(product)}
                      className="text-gray-500 hover:text-yellow-600 p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                      title={product.isHidden ? "Tampilkan" : "Sembunyikan"}
                    >
                      {product.isHidden ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(product)}
                      className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        setModalDelete({
                          isOpen: true,
                          type: "product",
                          id: product.id,
                        })
                      }
                      className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Hapus"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tampilan Riwayat Penjualan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Riwayat Penjualan
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"> {/* Make filters stack on mobile */}
            {/* Filter Waktu */}
            <select
              className="border border-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full sm:w-auto"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">Semua Waktu</option>
              <option value="thisWeek">Minggu Ini</option>
              <option value="thisMonth">Bulan Ini</option>
            </select>

            {/* Filter Kategori Pembeli */}
            <select
              className="border border-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full sm:w-auto"
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
            >
              <option value="all">Semua Pembeli</option>
              <option value="non-reseller">Non-Reseller</option>
              <option value="reseller">Reseller</option>
            </select>

            {/* Filter Kategori Produk */}
            <select
              className="border border-gray-300 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full sm:w-auto"
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
            >
              {productCategoryFilterOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "Semua Kategori Produk" : capitalizeForDisplay(category)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 hidden md:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kategori Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pembeli
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kategori Pembeli
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sales.map((sale) => {
                const product = products.find((p) => p.id === sale.productId);
                return (
                  <tr
                    key={sale.id}
                    className={
                      editingSaleId === sale.id
                        ? "bg-yellow-50 dark:bg-yellow-900/20 transition-colors duration-200"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.productName || (product ? product.name : "Produk Dihapus")}
                    </td>
                    <td className="px-6 py-4">
                      {editingSaleId === sale.id ? (
                        <select
                          value={editSaleForm.productCategory}
                          onChange={(e) =>
                            setEditSaleForm({
                              ...editSaleForm,
                              productCategory: e.target.value,
                            })
                          }
                          className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                          {editProductCategoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {capitalizeForDisplay(category)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        capitalizeForDisplay(sale.productCategory) || "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.qty}
                    </td>
                    <td className="px-6 py-4">
                      {editingSaleId === sale.id ? (
                        <input
                          type="text"
                          value={editSaleForm.buyerName}
                          onChange={(e) =>
                            setEditSaleForm({
                              ...editSaleForm,
                              buyerName: e.target.value,
                            })
                          }
                          className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      ) : (
                        sale.buyerName || "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingSaleId === sale.id ? (
                        <select
                          value={editSaleForm.customerType}
                          onChange={(e) =>
                            setEditSaleForm({
                              ...editSaleForm,
                              customerType: e.target.value,
                            })
                          }
                          className="p-1 border border-gray-300 rounded w-full bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                          <option value="non-reseller">Non-Reseller</option>
                          <option value="reseller">Reseller</option>
                        </select>
                      ) : (
                        capitalizeForDisplay(sale.customerType) || "Non-Reseller"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatRupiah(sale.qty * (sale.price || product?.price || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatTimestamp(sale.soldAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {editingSaleId === sale.id ? (
                          <>
                            <button
                              onClick={() => saveEditSale(sale.id)}
                              className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              title="Simpan Perubahan Penjualan"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelEditSale}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Batal Edit Penjualan"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openInvoiceModal(sale)}
                              className="text-gray-500 hover:text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              title="Cetak Struk"
                            >
                              <TicketIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => startEditSale(sale)}
                              className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="Edit Penjualan"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() =>
                                setModalDelete({
                                  isOpen: true,
                                  type: "sale",
                                  id: sale.id,
                                })
                              }
                              className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Hapus Penjualan"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Tampilan Card untuk Mobile (diperbaiki) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {sales.map((sale) => {
            const product = products.find((p) => p.id === sale.productId);
            return (
              <div
                key={sale.id}
                className={`bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm ${
                  editingSaleId === sale.id ? "border-2 border-yellow-400" : ""
                } transition-all duration-200`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                    {sale.productName || (product ? product.name : "Produk Dihapus")}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(sale.soldAt)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p>
                    <strong>Kategori Produk:</strong>{" "}
                    {editingSaleId === sale.id ? (
                      <select
                        value={editSaleForm.productCategory}
                        onChange={(e) =>
                          setEditSaleForm({
                            ...editSaleForm,
                            productCategory: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        {editProductCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {capitalizeForDisplay(category)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      capitalizeForDisplay(sale.productCategory) || "-"
                    )}
                  </p>
                  <p>
                    <strong>Jumlah:</strong> {sale.qty}
                  </p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white">
                    <strong>Total:</strong>{" "}
                    {formatRupiah(sale.qty * (sale.price || product?.price || 0))}
                  </p>
                  <p>
                    <strong>Pembeli:</strong>{" "}
                    {editingSaleId === sale.id ? (
                      <input
                        type="text"
                        value={editSaleForm.buyerName}
                        onChange={(e) =>
                          setEditSaleForm({
                            ...editSaleForm,
                            buyerName: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    ) : (
                      sale.buyerName || "-"
                    )}
                  </p>
                  <p>
                    <strong>Kategori Pembeli:</strong>{" "}
                    {editingSaleId === sale.id ? (
                      <select
                        value={editSaleForm.customerType}
                        onChange={(e) =>
                          setEditSaleForm({
                            ...editSaleForm,
                            customerType: e.target.value,
                          })
                        }
                        className="p-1 border border-gray-300 rounded w-full bg-white dark:bg-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="non-reseller">Non-Reseller</option>
                        <option value="reseller">Reseller</option>
                      </select>
                    ) : (
                      capitalizeForDisplay(sale.customerType) || "Non-Reseller"
                    )}
                  </p>
                </div>
                <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {editingSaleId === sale.id ? (
                    <>
                      <button
                        onClick={() => saveEditSale(sale.id)}
                        className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Simpan"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={cancelEditSale}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Batal"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openInvoiceModal(sale)}
                        className="text-gray-500 hover:text-green-600 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Cetak Struk"
                      >
                        <TicketIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => startEditSale(sale)}
                        className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setModalDelete({
                            isOpen: true,
                            type: "sale",
                            id: sale.id,
                          })
                        }
                        className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Hapus"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-right font-bold text-lg text-gray-800 dark:text-white">
          Total Pendapatan: {formatRupiah(totalRevenue)}
        </div>
      </div>

      {/* Modal Detail Produk */}
      {modalDetail.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl relative transition-all duration-300">
            <button
              onClick={() => setModalDetail({ isOpen: false, product: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {modalDetail.product.name}
            </h3>
            <img
              src={
                modalDetail.product.imageUrl ||
                "https://placehold.co/600x400/667eea/ffffff?text=Jeyo+Store"
              }
              alt={modalDetail.product.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Harga:</strong>{" "}
                {formatRupiah(modalDetail.product.price)}
              </p>
              <p>
                <strong>Stok Tersedia:</strong>{" "}
                {modalDetail.product.stock}
              </p>
              <p>
                <strong>Kategori:</strong>{" "}
                {capitalizeForDisplay(modalDetail.product.category) || "Tidak ada kategori"}
              </p>
              <p>
                <strong>Terakhir Tambah Stok:</strong>{" "}
                {formatTimestamp(modalDetail.product.lastStockAddedAt)}
                {modalDetail.product.lastStockAddedQty && (
                  <span className="text-green-600 font-bold ml-1">
                    (+{modalDetail.product.lastStockAddedQty})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Invoice/Struk */}
      {modalInvoice.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl relative transition-all duration-300">
            <button
              onClick={() =>
                setModalInvoice({ isOpen: false, saleDetails: null })
              }
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-white">
              Struk Pembelian
            </h3>
            <div className="border-t border-b border-dashed py-4 my-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong>Produk:</strong> {modalInvoice.saleDetails?.productName}
              </p>
              <p>
                <strong>Kategori Produk:</strong>{" "}
                {capitalizeForDisplay(modalInvoice.saleDetails?.productCategory)}
              </p>
              <p>
                <strong>Jumlah:</strong> {modalInvoice.saleDetails?.qty}
              </p>
              <p>
                <strong>Total Harga:</strong>{" "}
                {formatRupiah(
                  modalInvoice.saleDetails?.qty * modalInvoice.saleDetails?.price
                )}
              </p>
              <p>
                <strong>Pembeli:</strong> {modalInvoice.saleDetails?.buyerName || "-"}
              </p>
              <p>
                <strong>Kategori Pembeli:</strong>{" "}
                {capitalizeForDisplay(modalInvoice.saleDetails?.customerType) || "Non-Reseller"}
              </p>
              <p>
                <strong>Tanggal:</strong>{" "}
                {formatTimestamp(modalInvoice.saleDetails?.soldAt)}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={sendWhatsAppMessage}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
                disabled={loading}
              >
                Kirim via WhatsApp
              </button>
              <button
                onClick={() =>
                  setModalInvoice({ isOpen: false, saleDetails: null })
                }
                className="w-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {modalDelete.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl transition-all duration-300">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Konfirmasi Hapus
            </h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold">
                {modalDelete.type === "product" ? "produk ini" : "penjualan ini"}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() =>
                  setModalDelete({ isOpen: false, type: "", id: null })
                }
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(modalDelete.type, modalDelete.id)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}