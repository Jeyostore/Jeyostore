import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';

const AddStockForm = ({ onItemAdded }) => {
  const [nama, setNama] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama || !jumlah) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'stok'), {
        nama,
        jumlah: parseInt(jumlah),
        createdAt: serverTimestamp(),
      });
      setNotif('Berhasil menambahkan stok!');
      setNama('');
      setJumlah('');
      if (onItemAdded) onItemAdded();
    } catch (err) {
      console.error('Gagal tambah stok:', err);
      setNotif('Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border mt-8 w-full max-w-xl">
      <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
        <Plus size={20} /> Tambah Stok Baru
      </h3>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama barang"
          className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="number"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="Jumlah"
          className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-semibold"
        >
          {loading ? 'Menyimpan...' : 'Tambah'}
        </button>
        {notif && <p className="text-sm text-green-600 mt-1">{notif}</p>}
      </div>
    </form>
  );
};

export default AddStockForm;
