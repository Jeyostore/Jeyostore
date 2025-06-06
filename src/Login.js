import React, { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Impor untuk ikon dan loading spinner
import { FaEnvelope, FaLock, FaSignInAlt } from "react-icons/fa";
import ClipLoader from "react-spinners/ClipLoader";
import logo from "./logo.png"; // Pastikan path logo ini benar

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // Menggunakan string kosong untuk konsistensi
  const [loading, setLoading] = useState(false); // State untuk loading
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Reset error setiap kali login dicoba
    setLoading(true);

    if (!email || !password) {
      setError("Email dan password tidak boleh kosong.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // redirect ke dashboard setelah login
    } catch (err) {
      // Memberikan pesan error yang lebih ramah pengguna
      switch (err.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          setError("Email atau password yang Anda masukkan salah.");
          break;
        case "auth/invalid-email":
          setError("Format email tidak valid.");
          break;
        default:
          setError("Gagal untuk login. Silakan coba lagi.");
          break;
      }
    } finally {
      setLoading(false); // Hentikan loading setelah selesai (baik berhasil maupun gagal)
    }
  };

  return (
    // Latar belakang utama halaman
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      {/* Kartu Login Utama */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Kolom Kiri - Branding/Gambar */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center items-center bg-indigo-600 text-white">
          <img src={logo} alt="Jeyo Store Logo" className="w-24 h-24 mb-4" />
          <h1 className="text-3xl font-bold mb-2 text-center">Selamat Datang Kembali!</h1>
          <p className="text-indigo-200 text-center">Silakan masuk untuk mengelola data penjualan Jeyo Store.</p>
        </div>

        {/* Kolom Kanan - Form Login */}
        <div className="w-full md:w-1/2 p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Login ke Akun Anda</h2>
          
          <form onSubmit={handleLogin} noValidate>
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4 rounded-r-lg" role="alert">
                <p>{error}</p>
              </div>
            )}

            {/* Input Email dengan Ikon */}
            <div className="mb-4 relative">
              <label htmlFor="email" className="sr-only">Email</label>
              <FaEnvelope className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
            </div>

            {/* Input Password dengan Ikon */}
            <div className="mb-6 relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <FaLock className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
            </div>

            {/* Tombol Login dengan Efek Loading */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ease-in-out flex items-center justify-center disabled:bg-indigo-400"
            >
              {loading ? (
                <ClipLoader color="#ffffff" loading={loading} size={20} />
              ) : (
                <>
                  <FaSignInAlt className="mr-2" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
