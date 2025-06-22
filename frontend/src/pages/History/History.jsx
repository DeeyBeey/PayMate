import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './History.css';

export default function History() {
  const { currentUser } = useSelector((state) => state.user);
  const [splits, setSplits] = useState([]);

  useEffect(() => {
    const fetchSplits = async () => {
      const res = await fetch(`http://localhost:5000/server/splits/user/me`, {
        credentials: 'include',
      });
      const data = await res.json();
      setSplits(data);
    };
      
    if (currentUser) fetchSplits();
  }, [currentUser]);

  return (
    <div className="history-container">
      <h2>Your Past Receipts</h2>
      {splits.length === 0 ? (
        <p>No receipts found.</p>
      ) : (
        <ul className="history-list">
          {splits.map(split => (
            <li key={split._id} className="history-item">
              <div className="receipt-info">
                🧾 {split.receiptId?.store || 'Unknown Store'} – {split.receiptId?.date?.slice(0, 10)}
              </div>
              <div className="history-actions">
                <Link to={`/view-splits/${split._id}`} className="view-link">View</Link>
                <Link to={`/assign-splits/${split.receiptId?._id}`} className="edit-link">Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
