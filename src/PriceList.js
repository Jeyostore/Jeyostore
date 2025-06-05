import React, { useState, useEffect } from "react";

export default function PriceList() {
  const getInitialProducts = () => {
    const saved = localStorage.getItem("products");
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "Mie Lidi Pedas", price: 5000 },
      { id: 2, name: "Mie Lidi Asin", price: 5000 },
      { id: 3, name: "Mie Lidi Balado", price: 5000 },
    ];
  };

  const [products, setProducts] = useState(getInitialProducts);
  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [editedProduct, setEditedProduct] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showLoginForm, setShowLoginForm] = useState(false);

  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  const handleLogin = () => {
    const { username, password } = loginForm;
    if (username === "admin" && password === "123456") {
      setIsLoggedIn(true);
      setShowLoginForm(false);
      setLoginForm({ username: "", password: "" });
      alert("Login berhasil!");
    } else {
      alert("Login gagal!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    const newId = Date.now();
    setProducts([
      ...products,
      { id: newId, name: newProduct.name, price: parseInt(newProduct.price) },
    ]);
    setNewProduct({ name: "", price: "" });
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setProducts(products.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    setConfirmOpen(false);
  };

  const startEdit = (prod) => {
    setEditingId(prod.id);
    setEditedProduct({ name: prod.name, price: prod.price });
  };

  const handleSaveEdit = (id) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, ...editedProduct } : p)));
    setEditingId(null);
  };

  const filteredProducts = products
    .filter((prod) =>
      prod.name.toLowerCase().includes(keyword.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "asc" ? a.price - b.price :
      sortOrder === "desc" ? b.price - a.price :
      0
    );

  return (
    <div className="max-w-4xl mx-auto p-4 mt-6">
      <div className="flex justify-between mb-4 items-center">
        <h1 className="text-2xl font-bold">Daftar Harga Produk Kami</h1>
        <button
          className="px-3 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
          onClick={() => isLoggedIn ? handleLogout() : setShowLoginForm(!showLoginForm)}
        >
          {isLoggedIn ? "Logout" : "Login"}
        </button>
      </div>

      {!isLoggedIn && showLoginForm && (
        <div className="mb-4 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Silakan Login</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              placeholder="Username"
              className="p-2 border border-gray-300 rounded"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Password"
              className="p-2 border border-gray-300 rounded"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleLogin}
            >
              Login
            </button>
          </div>
        </div>
      )}

      {/* Pencarian dan Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Cari produk..."
          className="w-full sm:w-auto flex-1 p-2 border border-gray-300 rounded"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          onClick={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
        >
          Sort: {sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "None"}
        </button>
        <button
          className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => {
            setKeyword("");
            setSortOrder(null);
          }}
        >
          Reset
        </button>
      </div>

      {/* Tambah Produk */}
      {isLoggedIn && (
        <div className="mb-6 p-4 border border-gray-300 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Tambah Produk Baru</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nama Produk"
              className="p-2 border border-gray-300 rounded"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, name: e.target.value })
              }
            />
            <input
              type="number"
              placeholder="Harga"
              className="p-2 border border-gray-300 rounded"
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({ ...newProduct, price: e.target.value })
              }
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleAddProduct}
            >
              Tambah
            </button>
          </div>
        </div>
      )}

      {/* Tabel Produk */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="border p-2 text-left">Nama Produk</th>
            <th className="border p-2 text-right">Harga</th>
            {isLoggedIn && <th className="border p-2 text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((prod) => (
              <tr key={prod.id} className="hover:bg-indigo-50">
                <td className="border p-2">
                  {editingId === prod.id ? (
                    <input
                      value={editedProduct.name}
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          name: e.target.value,
                        })
                      }
                      className="w-full border p-1"
                    />
                  ) : (
                    prod.name
                  )}
                </td>
                <td className="border p-2 text-right">
                  {editingId === prod.id ? (
                    <input
                      type="number"
                      value={editedProduct.price}
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          price: parseInt(e.target.value),
                        })
                      }
                      className="w-full border p-1 text-right"
                    />
                  ) : (
                    new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(prod.price)
                  )}
                </td>
                {isLoggedIn && (
                  <td className="border p-2 text-center space-x-1">
                    {editingId === prod.id ? (
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                        onClick={() => handleSaveEdit(prod.id)}
                      >
                        Simpan
                      </button>
                    ) : (
                      <>
                        <button
                          className="bg-yellow-400 text-white px-2 py-1 rounded"
                          onClick={() => startEdit(prod)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded"
                          onClick={() => handleDelete(prod.id)}
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isLoggedIn ? 3 : 2} className="text-center p-4">
                Produk tidak ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal Konfirmasi Hapus */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <p className="mb-4 text-center">Apakah Anda yakin ingin menghapus produk ini?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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
