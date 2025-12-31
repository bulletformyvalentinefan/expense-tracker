import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = ({ user }) => {
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [popup, setPopup] = useState({ show: false, message: '', type: 'info' });

    const notify = (msg, type = 'info') => {
        setPopup({ show: true, message: msg.toUpperCase(), type });
        setTimeout(() => setPopup({ show: false, message: '', type: 'info' }), 3000);
    };

    const fetchData = async () => {
        try {
            const [expRes, catRes, userRes] = await Promise.all([
                axios.get('/api/expenses'),
                axios.get('/api/categories'),
                axios.get('/api/users')
            ]);
            setExpenses(expRes.data);
            setCategories(catRes.data);
            setUsersList(userRes.data);
            notify("DB_SYNC_COMPLETE", "success");
        } catch (error) {
            notify("CONNECTION_ERROR", "error");
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/expenses/${user.id}`, {
                description,
                amount: parseFloat(amount),
                categoryId: categoryId
            });
            setDescription(''); setAmount(''); setCategoryId('');
            notify("ENTRY_CREATED", "success");
            fetchData();
        } catch (error) {
            notify("SAVE_FAILED", "error");
        }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await axios.delete(`/api/expenses/${id}`);
            notify("DATA_DELETED", "success");
            fetchData();
        } catch (error) {
            notify("DELETE_ERROR", "error");
        }
    };

    const handleSelfDelete = async () => {
        if (window.confirm("CRITICAL_ACTION: TERMINATE_ACCOUNT?")) {
            try {
                await axios.delete(`/api/users/${user.id}`);
                notify("ACCOUNT_TERMINATED", "error");
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                notify("TERMINATION_FAILED", "error");
            }
        }
    };

    const filteredExpenses = filterCategory
        ? expenses.filter(e => e.categoryId === filterCategory)
        : expenses;

    return (
        <div style={styles.container}>
            {popup.show && (
                <div style={{
                    ...styles.popup,
                    borderLeft: `4px solid ${popup.type === 'error' ? '#ff4d4d' : '#00ff41'}`,
                }}>
                    {popup.message}
                </div>
            )}

            <div style={styles.content}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.brand}>EXPENSE.EXE</h1>
                        <p style={styles.userSub}>AUTH_USER: <span style={{color: '#fff'}}>{user?.name?.toUpperCase()}</span></p>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={handleSelfDelete} style={styles.terminateBtn}>TERMINATE_ACCOUNT</button>
                        <button onClick={fetchData} style={styles.refreshBtn}>RELOAD_SYSTEM</button>
                    </div>
                </header>

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
                    <form onSubmit={handleCreateExpense} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>DESCRIPTION</label>
                            <input
                                placeholder="E.G. CLOUD_SERVER_RENTAL"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                                style={styles.darkInput}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>AMOUNT (USD)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                                style={styles.darkInput}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.fieldLabel}>CATEGORY</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={styles.darkSelect}>
                                <option value="">SELECT_TYPE</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <button type="submit" style={styles.addBtn}>CREATE_ENTRY</button>
                    </form>
                </section>

                <div style={styles.summaryRow}>
                    <div style={styles.filterBox}>
                        <span style={styles.fieldLabel}>FILTER_BY:</span>
                        <select
                            style={styles.miniSelect}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="">ALL_CATEGORIES</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div style={styles.totalBox}>
                        <p style={styles.fieldLabel}>NET_TOTAL_ACCUMULATED</p>
                        <h2 style={styles.totalVal}>$ {filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</h2>
                    </div>
                </div>

                <div style={styles.listContainer}>
                    {filteredExpenses.map(expense => (
                        <div key={expense.id} style={styles.expenseCard}>
                            <div style={styles.cardInfo}>
                                <h3 style={styles.cardDesc}>{expense.description.toUpperCase()}</h3>
                                <span style={styles.cardCat}>TYPE::{expense.categoryName?.toUpperCase()}</span>
                            </div>
                            <div style={styles.cardAction}>
                                <span style={styles.cardAmount}>-{expense.amount.toFixed(2)}</span>
                                <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    style={styles.delBtn}
                                >
                                    DELETE
                                </button>
                            </div>
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
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' },
    brand: { fontSize: '1.2rem', fontWeight: '900', letterSpacing: '6px', margin: 0 },
    userSub: { fontSize: '0.6rem', color: '#444', marginTop: '8px', letterSpacing: '1px' },
    terminateBtn: { background: 'transparent', border: '1px solid #411', color: '#611', padding: '8px 15px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    refreshBtn: { background: 'transparent', border: '1px solid #222', color: '#888', padding: '8px 15px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    usersPanel: { marginBottom: '30px', padding: '20px', border: '1px solid #111', borderRadius: '8px' },
    userGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' },
    userTag: { fontSize: '0.55rem', color: '#666', border: '1px solid #222', padding: '4px 8px', borderRadius: '3px' },
    actionPanel: { background: '#080808', padding: '40px', borderRadius: '12px', border: '1px solid #111', marginBottom: '50px' },
    form: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '20px', alignItems: 'end' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
    fieldLabel: { fontSize: '0.55rem', color: '#333', fontWeight: 'bold', letterSpacing: '1.5px' },
    darkInput: { background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#fff', padding: '10px 0', outline: 'none' },
    darkSelect: { background: '#000', border: 'none', borderBottom: '1px solid #333', color: '#fff', padding: '10px 0', outline: 'none' },
    addBtn: { background: '#fff', color: '#000', border: 'none', height: '48px', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer', borderRadius: '6px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid #111', paddingBottom: '20px' },
    totalVal: { fontSize: '2.2rem', margin: 0, fontWeight: '200', letterSpacing: '-1px' },
    listContainer: { display: 'flex', flexDirection: 'column', gap: '15px' },
    expenseCard: { background: '#080808', padding: '25px', borderRadius: '10px', border: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardDesc: { fontSize: '0.85rem', margin: 0, fontWeight: '500', letterSpacing: '0.5px' },
    cardCat: { fontSize: '0.55rem', color: '#222', marginTop: '5px', display: 'block' },
    cardAmount: { fontSize: '1.1rem', fontFamily: 'monospace', marginRight: '30px' },
    delBtn: { background: 'transparent', border: '1px solid #200', color: '#622', padding: '6px 12px', fontSize: '0.55rem', cursor: 'pointer', borderRadius: '4px' },
    miniSelect: { background: '#000', color: '#fff', border: '1px solid #222', fontSize: '0.6rem', padding: '5px' }
};

export default Dashboard;