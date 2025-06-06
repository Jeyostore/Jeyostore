import React, { useEffect, useState, useContext, createContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  NavLink, // Menggunakan NavLink untuk active styling
} from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// --- ICONS ---
import { 
  FaSun, FaMoon, FaInstagram, FaTachometerAlt, FaBoxOpen, FaPlusCircle, FaSignOutAlt, FaBars, FaTimes, FaUserCircle 
} from "react-icons/fa";
import { ChartPieIcon, TableCellsIcon, DocumentPlusIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, SunIcon, MoonIcon, UserCircleIcon } from "@heroicons/react/24/outline";


import ClipLoader from "react-spinners/ClipLoader";

// --- PAGES (Impor seperti biasa) ---
import ProductList from "./ProductList";
import AddProduct from "./AddProduct";
import Dashboard from "./Dashboard";
import Login from "./Login";
import logo from "./logo.png";


//=================================================================
// 1. AUTHENTICATION CONTEXT 
// (Mengelola state login di seluruh aplikasi)
//=================================================================
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Menampilkan loading global sampai status auth terverifikasi */}
      {loading ? (
        <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-slate-900">
          <ClipLoader color="#4F46E5" loading={loading} size={60} />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

// Custom hook untuk menggunakan auth context
const useAuth = () => {
  return useContext(AuthContext);
};


//=================================================================
// 2. PROTECTED ROUTE COMPONENT
// (Melindungi halaman yang butuh login)
//=================================================================
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}


//=================================================================
// 3. UI COMPONENTS (Sidebar, Navbar, Layout, dll)
//=================================================================

// --- Sidebar untuk Desktop ---
function Sidebar() {
    const { user } = useAuth();

    const navLinks = [
        { name: "Dashboard", to: "/dashboard", icon: <ChartPieIcon className="w-6 h-6" /> },
        { name: "Produk & Penjualan", to: "/", icon: <TableCellsIcon className="w-6 h-6" /> },
        { name: "Tambah Produk", to: "/add-product", icon: <DocumentPlusIcon className="w-6 h-6" /> },
    ];

    const NavItem = ({ to, children }) => (
        <NavLink
            to={to}
            end // 'end' prop penting untuk NavLink ke path "/"
            className={({ isActive }) =>
                `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                isActive
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
            }
        >
            {children}
        </NavLink>
    );

    return (
        <div className="hidden md:flex flex-col w-64 bg-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-center h-20 border-b border-gray-700/75">
                <img src={logo} alt="Jeyo Store Logo" className="w-10 h-10 mr-3" />
                <h1 className="text-xl font-bold text-white">Jeyo Store</h1>
            </div>
            <nav className="flex-1 px-4 py-4">
                {navLinks.map((link) => (
                    <NavItem key={link.name} to={link.to}>
                        {link.icon}
                        <span className="ml-4 font-medium">{link.name}</span>
                    </NavItem>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-700/75">
                <div className="flex items-center">
                    <UserCircleIcon className="w-10 h-10 text-gray-500"/>
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-white">Admin</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Navbar (terutama untuk Mobile) ---
function Navbar({ onMenuClick }) {
    return (
        <header className="md:hidden flex items-center justify-between bg-white dark:bg-slate-800 h-16 p-4 shadow-md">
            <div className="flex items-center">
                <img src={logo} alt="Jeyo Store Logo" className="w-8 h-8" />
                <span className="text-lg font-bold ml-3 text-gray-800 dark:text-white">Jeyo Store</span>
            </div>
            <button onClick={onMenuClick} className="text-gray-600 dark:text-gray-300">
                <FaBars className="w-6 h-6"/>
            </button>
        </header>
    );
}


// --- Layout Utama (Sidebar + Konten Halaman) ---
function AppLayout() {
  const { user } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add("dark");
    }
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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      // Navigasi akan di-handle oleh ProtectedRoute secara otomatis
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };
  
  const navLinks = [
    { name: "Dashboard", to: "/dashboard", icon: <ChartPieIcon className="w-5 h-5" /> },
    { name: "Produk & Penjualan", to: "/", icon: <TableCellsIcon className="w-5 h-5" /> },
    { name: "Tambah Produk", to: "/add-product", icon: <DocumentPlusIcon className="w-5 h-5" /> },
  ];

  const NavItemMobile = ({ to, children }) => (
      <NavLink
          to={to}
          end
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) =>
              `flex items-center p-3 rounded-lg transition-colors duration-200 ${
              isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`
          }
      >
          {children}
      </NavLink>
  );


  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar untuk Desktop */}
      <Sidebar />

      {/* Mobile Menu (Overlay) */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${mobileMenuOpen ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`absolute top-0 left-0 h-full w-64 bg-gray-800 dark:bg-gray-900 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between h-20 p-4 border-b border-gray-700">
                <span className="text-xl font-bold text-white">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white">
                    <FaTimes className="w-6 h-6"/>
                </button>
            </div>
            <nav className="p-4 flex-1">
                {navLinks.map(link => (
                    <NavItemMobile key={link.name} to={link.to}>
                        {link.icon}
                        <span className="ml-4">{link.name}</span>
                    </NavItemMobile>
                ))}
            </nav>
            {/* Footer untuk Logout & Aksi di Mobile */}
            <div className="p-4 border-t border-gray-700 space-y-2">
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center w-full p-3 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  {darkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                  <span className="ml-4 font-medium">
                    {darkMode ? "Mode Terang" : "Mode Gelap"}
                  </span>
                </button>
                <div className="flex items-center pt-2 border-t border-gray-700/50">
                    <UserCircleIcon className="w-10 h-10 text-gray-500"/>
                    <div className="ml-3 flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white">Admin</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      title="Logout"
                    >
                      <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)}/>
        
        {/* Konten Utama */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {user && (
            <div className="hidden md:flex justify-between items-center p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-800">
                <div>
                    <h2 className="text-xl font-semibold">Selamat Datang, Admin!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ini adalah ringkasan aktivitas toko Anda.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700" title="Toggle Dark Mode">
                      {darkMode ? <SunIcon className="w-6 h-6"/> : <MoonIcon className="w-6 h-6"/>}
                    </button>
                    <button onClick={() => setShowLogoutModal(true)} className="flex items-center gap-2 p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Logout">
                      <ArrowLeftOnRectangleIcon className="w-6 h-6"/>
                      <span className="hidden lg:inline">Logout</span>
                    </button>
                </div>
            </div>
           )}
          <div className="p-4 md:p-6">
            <Routes>
                <Route path="/" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/add-product" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
                {/* Route login sekarang terpisah */}
            </Routes>
          </div>
        </main>
      </div>
      
      {/* Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-lg font-semibold mb-4">Konfirmasi Logout</h2>
                <p className="mb-6">Apakah Anda yakin ingin keluar dari sesi ini?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700" disabled={loggingOut}>Batal</button>
                    <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700" disabled={loggingOut}>
                        {loggingOut ? <ClipLoader color="#ffffff" size={20} /> : "Logout"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

//=================================================================
// 4. KOMPONEN APP UTAMA
// (Menggabungkan semuanya)
//=================================================================
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Semua route lain sekarang berada di dalam AppLayout dan dilindungi */}
          <Route path="/*" element={
              <ProtectedRoute>
                  <AppLayout />
              </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
