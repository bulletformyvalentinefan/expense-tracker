import React, { useEffect, useState, useMemo } from 'react';
import './Dashboard.css';

async function apiFetch(path, opts = {}) {
    const headers = { ...opts.headers };
    const token = localStorage.getItem('auth');
    if (token) headers['Authorization'] = `Basic ${token}`;
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, { ...opts, headers });
    if (!res.ok) {
        let err = {};
        try { err = await res.json(); } catch (_e) { void _e; }
        throw { status: res.status, message: err.message || err.error || res.statusText };
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return null;
}

const Dashboard = ({ user, onLogout }) => {
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [newCatName, setNewCatName] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [balance, setBalance] = useState({ startingBalance: 0, totalSpent: 0, currentBalance: 0 });
    const [startingInput, setStartingInput] = useState('');
    const [summary, setSummary] = useState([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [popup, setPopup] = useState({ show: false, message: '', type: 'info' });

    const notify = (msg, type = 'info') => {
        setPopup({ show: true, message: msg.toUpperCase(), type });
        setTimeout(() => setPopup({ show: false, message: '', type: 'info' }), 3000);
    };

    const fetchBalance = async () => {
        try {
            const data = await apiFetch(`/api/users/${user.id}/balance`);
            setBalance(data);
            setStartingInput(String(data.startingBalance ?? ''));
        } catch {
            const total = expenses.reduce((a, c) => a + c.amount, 0);
            setBalance(prev => ({ ...prev, totalSpent: total, currentBalance: prev.startingBalance - total }));
        }
    };

    const fetchSummary = async () => {
        try {
            const data = await apiFetch(`/api/users/${user.id}/summary/categories`);
            setSummary(data);
        } catch { setSummary([]); }
    };

    const fetchData = async () => {
        try {
            const exp = await apiFetch(`/api/users/${user.id}/expenses?limit=100`).catch(() => apiFetch('/api/expenses'));
            const cats = await apiFetch('/api/categories');
            const users = await apiFetch('/api/users');
            setExpenses(Array.isArray(exp) ? exp : []);
            setCategories(Array.isArray(cats) ? cats : []);
            setUsersList(Array.isArray(users) ? users : []);
            notify("DB_SYNC_COMPLETE", "success");
        } catch (error) {
            notify(error.message || "CONNECTION_ERROR", "error");
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); fetchBalance(); fetchSummary(); }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchBalance(); fetchSummary(); }, [expenses.length]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) { notify("CATEGORY_NAME_REQUIRED", "error"); return; }
        try {
            await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() || null }) });
            setNewCatName(''); setNewCatDesc('');
            notify("CATEGORY_CREATED", "success");
            fetchData(); fetchSummary();
        } catch (error) { notify(error.message || "SAVE_FAILED", "error"); }
    };

    const handleUpdateBalance = async (e) => {
        e.preventDefault();
        const v = parseFloat(startingInput);
        if (isNaN(v) || v < 0) { notify("INVALID_BALANCE", "error"); return; }
        try {
            await apiFetch(`/api/users/${user.id}/balance`, { method: 'PUT', body: JSON.stringify({ startingBalance: v }) });
            notify("BALANCE_UPDATED", "success");
            fetchBalance();
        } catch (error) { notify(error.message || "UPDATE_FAILED", "error"); }
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        if (categories.length === 0) { notify("CREATE_CATEGORY_FIRST", "error"); return; }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) { notify("INVALID_AMOUNT", "error"); return; }
        const payload = { description, amount: parsed, categoryId };
        if (expenseDate) payload.date = new Date(expenseDate).toISOString();
        try {
            await apiFetch(`/api/expenses/${user.id}`, { method: 'POST', body: JSON.stringify(payload) });
            setDescription(''); setAmount(''); setCategoryId('');
            notify("ENTRY_CREATED", "success");
            fetchData();
        } catch (error) { notify(error.message || "SAVE_FAILED", "error"); }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
            notify("DATA_DELETED", "success");
            fetchData();
        } catch (error) { notify(error.message || "DELETE_ERROR", "error"); }
    };

    const handleSelfDelete = async () => {
        if (window.confirm("CRITICAL_ACTION: TERMINATE_ACCOUNT?")) {
            try {
                await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' });
                notify("ACCOUNT_TERMINATED", "error");
                setTimeout(() => { onLogout(); }, 2000);
            } catch { notify("TERMINATION_FAILED", "error"); }
        }
    };

    const totalSpent = useMemo(() => balance.totalSpent ?? expenses.filter(e => (e.user?.id || e.userId) === user.id).reduce((a, c) => a + (c.amount || 0), 0), [balance, expenses, user.id]);
    const currentBalance = useMemo(() => balance.currentBalance ?? (balance.startingBalance - totalSpent), [balance, totalSpent]);
    const pctLeft = balance.startingBalance > 0 ? Math.max(0, Math.min(100, (currentBalance / balance.startingBalance) * 100)) : 0;

    const filtered = useMemo(() => {
        let arr = filterCategory ? expenses.filter(e => (e.category?.id || e.categoryId) === filterCategory) : [...expenses];
        if (search.trim()) arr = arr.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));
        if (sortBy === 'newest') arr.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sortBy === 'oldest') arr.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (sortBy === 'highest') arr.sort((a, b) => b.amount - a.amount);
        return arr;
    }, [expenses, filterCategory, search, sortBy]);

    const grouped = useMemo(() => {
        const map = new Map();
        filtered.forEach(e => {
            const key = e.date ? new Date(e.date).toISOString().slice(0, 10) : 'UNDATED';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(e);
        });
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filtered]);

    return (
        <div className="dashboard-wrap">
            {popup.show && (
                <div className={`popup ${popup.type}`}>{popup.message}</div>
            )}

            <div className="dashboard-content">
                <header className="dash-header">
                    <div>
                        <h1 className="brand">EXPENSE.EXE</h1>
                        <p className="userSub">AUTH_USER: <span>{user?.name?.toUpperCase()}</span></p>
                    </div>
                    <div className="header-actions">
                        <button onClick={onLogout} className="btn-ghost">LOGOUT</button>
                        <button onClick={handleSelfDelete} className="btn-danger">TERMINATE</button>
                        <button onClick={() => { fetchData(); fetchBalance(); fetchSummary(); }} className="btn-ghost">RELOAD</button>
                    </div>
                </header>

                <section className="wallet">
                    <div className="wallet-grid">
                        <div className="wallet-card"><p className="label">SALDO_INICIAL</p><h2 className="wallet-val">$ {balance.startingBalance?.toFixed(2) ?? '0.00'}</h2></div>
                        <div className="wallet-card"><p className="label">GASTADO</p><h2 className="wallet-val danger">$ {totalSpent.toFixed(2)}</h2></div>
                        <div className={`wallet-card ${pctLeft < 15 ? 'warn' : ''}`}><p className="label">SALDO_ACTUAL</p><h2 className={`wallet-val ${pctLeft < 15 ? 'danger' : 'ok'}`}>$ {currentBalance.toFixed(2)}</h2><p className="pct">{pctLeft.toFixed(0)}% RESTANTE</p></div>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${pctLeft}%`, background: pctLeft < 15 ? '#ff4d4d' : pctLeft < 30 ? '#ffaa00' : '#00ff41' }} /></div>
                    <form onSubmit={handleUpdateBalance} className="balance-form">
                        <label className="label">EDITAR_SALDO_INICIAL</label>
                        <div className="balance-row">
                            <input type="number" value={startingInput} onChange={e => setStartingInput(e.target.value)} placeholder="0.00" />
                            <button type="submit" className="btn-primary">GUARDAR</button>
                        </div>
                    </form>
                    {balance.startingBalance === 0 && <p className="tip">TIP: CONFIGURA TU SALDO INICIAL</p>}
                </section>

                {summary.length > 0 && (
                    <section className="breakdown">
                        <p className="label">GASTO_POR_CATEGORIA</p>
                        <div className="break-list">
                            {summary.map(s => {
                                const max = Math.max(...summary.map(x => x.totalSpent), 1);
                                const pct = (s.totalSpent / max) * 100;
                                return (
                                    <div key={s.id} className="break-row" onClick={() => setFilterCategory(s.id)}>
                                        <span className="break-name">{s.name.toUpperCase()}</span>
                                        <div className="break-track"><div className="break-fill" style={{ width: `${pct}%` }} /></div>
                                        <span className="break-amt">${s.totalSpent.toFixed(2)}</span>
                                        <span className="break-cnt">{s.count} • {(s.totalSpent / (totalSpent || 1) * 100).toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section className="panel users-panel">
                    <p className="label">SYSTEM_USERS</p>
                    <div className="user-grid">{usersList.map(u => (<div key={u.id} className="user-tag">{u.name.toUpperCase()} {u.id === user.id && "(YOU)"}</div>))}</div>
                </section>

                <section className="panel action-panel">
                    <div className="subpanel">
                        <p className="label">CREATE_CATEGORY</p>
                        <form onSubmit={handleCreateCategory} className="cat-form">
                            <input placeholder="CATEGORY_NAME" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
                            <input placeholder="DESCRIPTION (opcional)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} />
                            <button type="submit" className="btn-primary">ADD</button>
                        </form>
                        {categories.length === 0 && <p className="warn">NO_CATEGORIES — CREATE ONE FIRST</p>}
                    </div>
                    <form onSubmit={handleCreateExpense} className="expense-form">
                        <label className="label">DESCRIPTION<input placeholder="E.G. CLOUD_SERVER" value={description} onChange={e => setDescription(e.target.value)} required /></label>
                        <label className="label">AMOUNT<input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
                        <label className="label">CATEGORY<select value={categoryId} onChange={e => setCategoryId(e.target.value)} required><option value="">SELECT</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}</select></label>
                        <label className="label">DATE<input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required /></label>
                        <button type="submit" disabled={categories.length === 0} className="btn-primary full">CREATE_ENTRY</button>
                    </form>
                </section>

                <div className="summary-row">
                    <div className="filters">
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="mini-select"><option value="">ALL</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}</select>
                        <input placeholder="SEARCH" value={search} onChange={e => setSearch(e.target.value)} className="search" />
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="mini-select"><option value="newest">NEWEST</option><option value="oldest">OLDEST</option><option value="highest">HIGHEST</option></select>
                    </div>
                    <div className="total-box"><p className="label">NET_TOTAL_FILTRADO</p><h2 className="total-val">$ {filtered.reduce((a, c) => a + c.amount, 0).toFixed(2)}</h2><p className="count">{filtered.length} compras</p></div>
                </div>

                <div className="list">
                    {grouped.length === 0 && <p className="empty">NO_PURCHASES_YET</p>}
                    {grouped.map(([day, items]) => (
                        <div key={day} className="day-group">
                            <p className="day-label">{day} — {items.length} — $ {items.reduce((a, c) => a + c.amount, 0).toFixed(2)}</p>
                            {items.map(expense => (
                                <div key={expense.id} className="card">
                                    <div><h3>{expense.description.toUpperCase()}</h3><span className="cat">{(expense.category?.name || 'UNKNOWN').toUpperCase()} • {new Date(expense.date).toLocaleDateString()}</span></div>
                                    <div className="card-actions"><span className="amount">-{expense.amount.toFixed(2)}</span><button onClick={() => handleDeleteExpense(expense.id)} className="btn-del">DELETE</button></div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
