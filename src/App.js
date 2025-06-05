import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { FaSun, FaMoon, FaInstagram } from "react-icons/fa";

import ClipLoader from "react-spinners/ClipLoader";

import ProductList from "./ProductList";
import AddProduct from "./AddProduct";
import Dashboard from "./Dashboard";
import Login from "./Login";
import PriceList from "./PriceList";

import logo from "./logo.png";

function Navbar({ user, darkMode, toggleDarkMode, menuOpen, setMenuOpen, openLogoutModal, handleLinkClick }) {
  const location = useLocation();
  const isPriceListPage = location.pathname === "/price-list";

  return (
    <nav className="bg-indigo-600 dark:bg-gray-800 text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={logo} alt="Jeyo Store Logo" className="w-8 h-8" />
        <Link to="/dashboard" onClick={handleLinkClick} className="text-lg font-semibold">
          Jeyo Store
        </Link>

        {/* Tombol Dark Mode: icon only di mobile, full text di desktop */}
        <button
          onClick={toggleDarkMode}
          className="ml-2 p-2 rounded bg-indigo-700 dark:bg-gray-700 hover:bg-indigo-800 dark:hover:bg-gray-600 transition sm:flex hidden"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>

      <button
        className="sm:hidden block p-2 focus:outline-none"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Menu desktop */}
      <div className="hidden sm:flex gap-6 items-center">
        {isPriceListPage ? (
          <div className="mx-auto font-semibold text-lg">Daftar Harga Produk Kami</div>
        ) : (
          <>
            <Link to="/dashboard" className="hover:underline" onClick={handleLinkClick}>
              Dashboard
            </Link>
            <Link to="/" className="hover:underline" onClick={handleLinkClick}>
              Daftar Produk & Penjualan
            </Link>
            <Link to="/add-product" className="hover:underline" onClick={handleLinkClick}>
              Tambah Produk
            </Link>
            <Link to="/price-list" className="hover:underline" onClick={handleLinkClick}>
              Daftar Harga Produk Kami
            </Link>
            {user ? (
              <button
                onClick={openLogoutModal}
                className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
              >
                Logout
              </button>
            ) : (
              <Link to="/login" className="hover:underline" onClick={handleLinkClick}>
                Login
              </Link>
            )}
          </>
        )}
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="sm:hidden bg-indigo-600 dark:bg-gray-800 text-white flex flex-col p-4 gap-4 z-50 fixed top-16 right-4 left-4 mx-auto rounded-lg shadow-lg transition-transform duration-300 ease-in-out">
            {isPriceListPage ? (
              <div className="mx-auto font-semibold text-lg">Daftar Harga Produk Kami</div>
            ) : (
              <>
                <Link to="/dashboard" className="hover:text-indigo-200" onClick={handleLinkClick}>
                  Dashboard
                </Link>
                <Link to="/" className="hover:text-indigo-200" onClick={handleLinkClick}>
                  Daftar Produk & Penjualan
                </Link>
                <Link to="/add-product" className="hover:text-indigo-200" onClick={handleLinkClick}>
                  Tambah Produk
                </Link>
                <Link to="/price-list" className="hover:text-indigo-200" onClick={handleLinkClick}>
                  Daftar Harga Produk Kami
                </Link>
                {user ? (
                  <button
                    onClick={openLogoutModal}
                    className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-left"
                  >
                    Logout
                  </button>
                ) : (
                  <Link to="/login" className="hover:text-indigo-200" onClick={handleLinkClick}>
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorLogout, setErrorLogout] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add("dark");
    }

    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", newMode);
  };

  const openLogoutModal = () => {
    setErrorLogout(null);
    setShowLogoutModal(true);
    setMenuOpen(false);
  };

  const closeLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const handleLogoutConfirmed = async () => {
    setLoggingOut(true);
    setErrorLogout(null);
    try {
      await signOut(auth);
      setShowLogoutModal(false);
    } catch (error) {
      setErrorLogout("Gagal logout. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader color="#4F46E5" loading={loading} size={60} />
      </div>
    );
  }

  return (
    <>
      <Router>
        <Navbar
          user={user}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          openLogoutModal={openLogoutModal}
          handleLinkClick={handleLinkClick}
        />

        {user && (
          <div className="bg-green-100 text-green-800 p-4 text-center font-medium">
            Selamat datang di data admin penjualan <span className="font-bold">Jeyo Store</span>
          </div>
        )}

        {/* Padding bawah lebih besar di mobile agar konten tidak tertutup footer */}
        <main className="pb-28 sm:pb-16">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/add-product" element={user ? <AddProduct /> : <Navigate to="/login" />} />
            <Route path="/" element={user ? <ProductList /> : <Navigate to="/login" />} />
            {/* Halaman daftar harga terbuka tanpa login */}
            <Route path="/price-list" element={<PriceList />} />
          </Routes>
        </main>
      </Router>

      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded p-6 w-80 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Konfirmasi Logout</h2>
            {errorLogout && (
              <div className="bg-red-200 text-red-700 p-2 mb-3 rounded">{errorLogout}</div>
            )}
            <p className="mb-4">Apakah Anda yakin ingin logout?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeLogoutModal}
                className="px-3 py-1 rounded border border-gray-400 hover:bg-gray-100"
                disabled={loggingOut}
              >
                Batal
              </button>
              <button
                onClick={handleLogoutConfirmed}
                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                disabled={loggingOut}
              >
                {loggingOut ? "Logout..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 w-full bg-indigo-700 dark:bg-gray-900 text-white flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm sm:text-base text-center sm:text-left shadow-lg z-50">
        <a
          href="https://instagram.com/jeyoofficial.store"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-pink-400 transition-transform transform hover:scale-110"
          aria-label="Instagram Jeyo Store"
        >
          <FaInstagram className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="font-medium">Follow us on Instagram @jeyoofficial.store</span>
        </a>
      </footer>
    </>
  );
}
