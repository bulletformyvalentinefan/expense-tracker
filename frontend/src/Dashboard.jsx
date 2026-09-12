import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

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
            const res = await axios.get(`/api/users/${user.id}/balance`);
            setBalance(res.data);
            setStartingInput(String(res.data.startingBalance ?? ''));
        } catch {
            // fallback: compute from global expenses if endpoint fails (old backend)
            const total = expenses.reduce((a, c) => a + c.amount, 0);
            setBalance(prev => ({ ...prev, totalSpent: total, currentBalance: prev.startingBalance - total }));
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await axios.get(`/api/users/${user.id}/summary/categories`);
            setSummary(res.data);
        } catch { setSummary([]); }
    };

    const fetchData = async () => {
        try {
            const [expRes, catRes, userRes] = await Promise.all([
                // prefer per-user filtered history, fallback to global
                axios.get(`/api/users/${user.id}/expenses?limit=100`).catch(() => axios.get('/api/expenses')),
                axios.get('/api/categories'),
                axios.get('/api/users')
            ]);
            setExpenses(expRes.data);
            setCategories(catRes.data);
            setUsersList(userRes.data);
            notify("DB_SYNC_COMPLETE", "success");
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || "CONNECTION_ERROR";
            notify(msg, "error");
        }
    };

    useEffect(() => { fetchData(); fetchBalance(); fetchSummary(); }, []);
    useEffect(() => { fetchBalance(); fetchSummary(); }, [expenses.length]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) { notify("CATEGORY_NAME_REQUIRED", "error"); return; }
        try {
            await axios.post('/api/categories', { name: newCatName.trim(), description: newCatDesc.trim() || null });
            setNewCatName(''); setNewCatDesc('');
            notify("CATEGORY_CREATED", "success");
            fetchData(); fetchSummary();
        } catch (error) {
            const msg = error.response?.data?.message || "SAVE_FAILED";
            notify(msg, "error");
        }
    };

    const handleUpdateBalance = async (e) => {
        e.preventDefault();
        const v = parseFloat(startingInput);
        if (isNaN(v) || v < 0) { notify("INVALID_BALANCE", "error"); return; }
        try {
            await axios.put(`/api/users/${user.id}/balance`, { startingBalance: v });
            notify("BALANCE_UPDATED", "success");
            fetchBalance();
        } catch (error) {
            const msg = error.response?.data?.message || "UPDATE_FAILED";
            notify(msg, "error");
        }
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        if (categories.length === 0) { notify("CREATE_CATEGORY_FIRST", "error"); return; }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) { notify("INVALID_AMOUNT", "error"); return; }
        const payload = { description, amount: parsed, categoryId };
        if (expenseDate) payload.date = new Date(expenseDate).toISOString();
        try {
            await axios.post(`/api/expenses/${user.id}`, payload);
            setDescription(''); setAmount(''); setCategoryId('');
            notify("ENTRY_CREATED", "success");
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || "SAVE_FAILED";
            notify(msg, "error");
        }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await axios.delete(`/api/expenses/${id}`);
            notify("DATA_DELETED", "success");
            fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || "DELETE_ERROR";
            notify(msg, "error");
        }
    };

    const handleSelfDelete = async () => {
        if (window.confirm("CRITICAL_ACTION: TERMINATE_ACCOUNT?")) {
            try {
                await axios.delete(`/api/users/${user.id}`);
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
        // sort groups newest first
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filtered]);

    return (
        <div style={styles.container}>
            {popup.show && (
                <div style={{ ...styles.popup, borderLeft: `4px solid ${popup.type === 'error' ? '#ff4d4d' : '#00ff41'}` }}>
                    {popup.message}
                </div>
            )}

            <div style={styles.content}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.brand}>EXPENSE.EXE</h1>
                        <p style={styles.userSub}>AUTH_USER: <span style={{ color: '#fff' }}>{user?.name?.toUpperCase()}</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onLogout} style={styles.refreshBtn}>LOGOUT</button>
                        <button onClick={handleSelfDelete} style={styles.terminateBtn}>TERMINATE_ACCOUNT</button>
                        <button onClick={() => { fetchData(); fetchBalance(); fetchSummary(); }} style={styles.refreshBtn}>RELOAD_SYSTEM</button>
                    </div>
                </header>

                {/* Wallet / Balance */}
                <section style={styles.wallet}>
                    <div style={styles.walletGrid}>
                        <div style={styles.walletCard}>
                            <p style={styles.fieldLabel}>SALDO_INICIAL</p>
                            <h2 style={styles.walletVal}>$ {balance.startingBalance?.toFixed(2) ?? '0.00'}</h2>
                        </div>
                        <div style={styles.walletCard}>
                            <p style={styles.fieldLabel}>TOTAL_GASTADO</p>
                            <h2 style={{ ...styles.walletVal, color: '#ff5555' }}>$ {totalSpent.toFixed(2)}</h2>
                        </div>
                        <div style={{ ...styles.walletCard, border: `1px solid ${pctLeft < 15 ? '#ff4d4d' : '#111'}` }}>
                            <p style={styles.fieldLabel}>SALDO_ACTUAL</p>
                            <h2 style={{ ...styles.walletVal, color: pctLeft < 15 ? '#ff4d4d' : '#00ff41' }}>$ {currentBalance.toFixed(2)}</h2>
                            <p style={{ fontSize: '0.55rem', color: '#888' }}>{pctLeft.toFixed(0)}% RESTANTE</p>
                        </div>
                    </div>
                    <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${pctLeft}%`, background: pctLeft < 15 ? '#ff4d4d' : pctLeft < 30 ? '#ffaa00' : '#00ff41' }} /></div>
                    <form onSubmit={handleUpdateBalance} style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={styles.fieldLabel}>EDITAR_SALDO_INICIAL</label>
                            <input type="number" value={startingInput} onChange={e => setStartingInput(e.target.value)} placeholder="0.00" style={styles.darkInput} />
                        </div>
                        <button type="submit" style={{ ...styles.addBtn, height: '36px', padding: '0 18px' }}>GUARDAR_SALDO</button>
                    </form>
                    {balance.startingBalance === 0 && <p style={{ ...styles.fieldLabel, color: '#ffaa00', marginTop: '8px' }}>TIP: CONFIGURA TU SALDO INICIAL PARA VER EL SALDO REAL</p>}
                </section>

                {/* Category breakdown */}
                {summary.length > 0 && (
                    <section style={styles.breakdown}>
                        <p style={styles.fieldLabel}>GASTO_POR_CATEGORIA</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {summary.map(s => {
                                const max = Math.max(...summary.map(x => x.totalSpent), 1);
                                const pct = (s.totalSpent / max) * 100;
                                return (
                                    <div key={s.id} style={styles.breakRow} onClick={() => setFilterCategory(s.id)} title="Filtrar">
                                        <span style={styles.breakName}>{s.name.toUpperCase()}</span>
                                        <div style={styles.breakBarTrack}><div style={{ ...styles.breakBar, width: `${pct}%` }} /></div>
                                        <span style={styles.breakAmt}>${s.totalSpent.toFixed(2)}</span>
                                        <span style={styles.breakCnt}>{s.count} compras • {(s.totalSpent / (totalSpent || 1) * 100).toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section style={styles.usersPanel}>
                    <p style={styles.fieldLabel}>ACTIVE_SYSTEM_USERS</p>
                    <div style={styles.userGrid}>
                        {usersList.map(u => (
                            <div key={u.id} style={styles.userTag}>
                                {u.name.toUpperCase()} {u.id === user.id && "(YOU)"}
                            </div>
                        ))}
                    </div>
                </section>

                <section style={styles.actionPanel}>
                    <div style={{ marginBottom: '30px', padding: '20px', border: '1px dashed #333', borderRadius: '8px' }}>
                        <p style={styles.fieldLabel}>CREATE_CATEGORY</p>
                        <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <input placeholder="CATEGORY_NAME" value={newCatName} onChange={e => setNewCatName(e.target.value)} required style={{ ...styles.darkInput, flex: 1 }} />
                            <input placeholder="DESCRIPTION (optional)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} style={{ ...styles.darkInput, flex: 1 }} />
                            <button type="submit" style={{ ...styles.addBtn, height: '38px', padding: '0 20px' }}>ADD_CATEGORY</button>
                        </form>
                        {categories.length === 0 && <p style={{ ...styles.fieldLabel, color: '#ff4d4d', marginTop: '10px' }}>NO_CATEGORIES_DETECTED — CREATE ONE FIRST</p>}
                    </div>
                    <form onSubmit={handleCreateExpense} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>DESCRIPTION</label>
                            <input placeholder="E.G. CLOUD_SERVER_RENTAL" value={description} onChange={e => setDescription(e.target.value)} required style={styles.darkInput} />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>AMOUNT (USD)</label>
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required style={styles.darkInput} />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>CATEGORY</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={styles.darkSelect}>
                                <option value="">SELECT_TYPE</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>DATE</label>
                            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required style={styles.darkInput} />
                        </div>
                        <button type="submit" disabled={categories.length === 0} title={categories.length === 0 ? "Create a category first" : ""} style={{ ...styles.addBtn, opacity: categories.length === 0 ? 0.4 : 1, cursor: categories.length === 0 ? 'not-allowed' : 'pointer' }}>CREATE_ENTRY</button>
                    </form>
                </section>

                <div style={styles.summaryRow}>
                    <div style={styles.filterBox}>
                        <span style={styles.fieldLabel}>FILTER_BY:</span>
                        <select value={filterCategory} style={styles.miniSelect} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="">ALL_CATEGORIES</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                        </select>
                        <input placeholder="SEARCH_DESC" value={search} onChange={e => setSearch(e.target.value)} style={{ ...styles.darkInput, marginLeft: '10px', width: '160px' }} />
                        <select value={sortBy} style={{ ...styles.miniSelect, marginLeft: '8px' }} onChange={e => setSortBy(e.target.value)}>
                            <option value="newest">NEWEST</option>
                            <option value="oldest">OLDEST</option>
                            <option value="highest">HIGHEST</option>
                        </select>
                    </div>
                    <div style={styles.totalBox}>
                        <p style={styles.fieldLabel}>NET_TOTAL_FILTRADO</p>
                        <h2 style={styles.totalVal}>$ {filtered.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</h2>
                        <p style={{ fontSize: '0.55rem', color: '#666' }}>{filtered.length} compras</p>
                    </div>
                </div>

                <div style={styles.listContainer}>
                    {grouped.length === 0 && <p style={{ ...styles.fieldLabel, textAlign: 'center', padding: '20px' }}>NO_PURCHASES_YET — CREATE_FIRST_ENTRY</p>}
                    {grouped.map(([day, items]) => (
                        <div key={day}>
                            <p style={{ ...styles.fieldLabel, margin: '15px 0 8px', color: '#666' }}>{day} — {items.length} compras — $ {items.reduce((a, c) => a + c.amount, 0).toFixed(2)}</p>
                            {items.map(expense => (
                                <div key={expense.id} style={styles.expenseCard}>
                                    <div style={styles.cardInfo}>
                                        <h3 style={styles.cardDesc}>{expense.description.toUpperCase()}</h3>
                                        <span style={styles.cardCat}>TYPE::{ (expense.category?.name || expense.categoryName || 'UNKNOWN')?.toUpperCase() } • {new Date(expense.date).toLocaleDateString()}</span>
                                    </div>
                                    <div style={styles.cardAction}>
                                        <span style={styles.cardAmount}>-{expense.amount.toFixed(2)}</span>
                                        <button onClick={() => handleDeleteExpense(expense.id)} style={styles.delBtn}>DELETE</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '60px 20px', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' },
    content: { width: '100%', maxWidth: '900px' },
    popup: { position: 'fixed', top: '20px', right: '20px', background: '#0a0a0a', border: '1px solid #1a1a1a', padding: '15px 25px', fontSize: '0.65rem', letterSpacing: '2px', zIndex: 1000, borderRadius: '4px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    brand: { fontSize: '1.2rem', fontWeight: '900', letterSpacing: '6px', margin: 0 },
    userSub: { fontSize: '0.6rem', color: '#888', marginTop: '8px', letterSpacing: '1px' },
    terminateBtn: { background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 15px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    refreshBtn: { background: 'transparent', border: '1px solid #222', color: '#888', padding: '8px 15px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    wallet: { marginBottom: '30px', padding: '25px', border: '1px solid #1a1a1a', borderRadius: '12px', background: '#070707' },
    walletGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
    walletCard: { padding: '15px', border: '1px solid #111', borderRadius: '8px', background: '#0a0a0a', textAlign: 'center' },
    walletVal: { fontSize: '1.4rem', margin: '8px 0 0', fontWeight: '300', letterSpacing: '-0.5px' },
    progressTrack: { height: '6px', background: '#111', borderRadius: '3px', marginTop: '15px', overflow: 'hidden' },
    progressFill: { height: '100%', transition: 'width 0.3s' },
    breakdown: { marginBottom: '30px', padding: '20px', border: '1px solid #111', borderRadius: '8px' },
    breakRow: { display: 'grid', gridTemplateColumns: '120px 1fr 80px 140px', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid #111', borderRadius: '6px', cursor: 'pointer', background: '#080808' },
    breakName: { fontSize: '0.6rem', fontWeight: '700', letterSpacing: '1px' },
    breakBarTrack: { height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' },
    breakBar: { height: '100%', background: '#fff' },
    breakAmt: { fontSize: '0.7rem', fontFamily: 'monospace', textAlign: 'right' },
    breakCnt: { fontSize: '0.55rem', color: '#888', textAlign: 'right' },
    usersPanel: { marginBottom: '20px', padding: '15px', border: '1px solid #111', borderRadius: '8px' },
    userGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' },
    userTag: { fontSize: '0.55rem', color: '#eee', border: '1px solid #444', padding: '4px 8px', borderRadius: '3px' },
    actionPanel: { background: '#080808', padding: '30px', borderRadius: '12px', border: '1px solid #111', marginBottom: '30px' },
    form: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'end' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    fieldLabel: { fontSize: '0.55rem', color: '#aaa', fontWeight: 'bold', letterSpacing: '1.5px' },
    darkInput: { background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', padding: '10px 0', outline: 'none', width: '100%' },
    darkSelect: { background: '#000', border: 'none', borderBottom: '1px solid #333', color: '#fff', padding: '10px 0', outline: 'none', width: '100%' },
    addBtn: { background: '#fff', color: '#000', border: 'none', height: '48px', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer', borderRadius: '6px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', borderBottom: '1px solid #111', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' },
    totalVal: { fontSize: '1.8rem', margin: 0, fontWeight: '200', letterSpacing: '-1px' },
    listContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
    expenseCard: { background: '#080808', padding: '20px', borderRadius: '10px', border: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardDesc: { fontSize: '0.85rem', margin: 0, fontWeight: '500', letterSpacing: '0.5px' },
    cardCat: { fontSize: '0.55rem', color: '#888', marginTop: '5px', display: 'block' },
    cardAmount: { fontSize: '1rem', fontFamily: 'monospace', marginRight: '20px' },
    delBtn: { background: 'transparent', border: '1px solid #411', color: '#a44', padding: '6px 12px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    miniSelect: { background: '#000', color: '#fff', border: '1px solid #222', fontSize: '0.6rem', padding: '5px' },
    filterBox: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    totalBox: { textAlign: 'right' },
};

export default Dashboard;
