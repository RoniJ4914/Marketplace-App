import React, { useState, useEffect } from 'react';

function App() {
  // Load initial data from localStorage or use default if nothing is stored
  const getInitialData = () => {
    const savedData = localStorage.getItem('marketplaceData');
    if (savedData) {
      return JSON.parse(savedData);
    }
    return {
      isLoggedIn: false,
      currentUser: null,
      loginAttempts: {},
      lockedAccounts: {},
      adminBalance: 0, // Added admin balance
      users: {
        customer1: {
          type: 'customer',
          credits: 0,
          password: 'pass1',
          email: 'customer1@example.com',
          pendingTransactions: []
        },
        vendor1: {
          type: 'vendor',
          credits: 0,
          password: 'pass1',
          email: 'vendor1@example.com',
          location: 'Downtown Market',
          products: [
            { name: 'Coffee', price: 25 },
            { name: 'Tea', price: 20 }
          ]
        }
      }
    };
  };

  const [userData, setUserData] = useState(getInitialData);

  // Save to localStorage whenever userData changes
  useEffect(() => {
    localStorage.setItem('marketplaceData', JSON.stringify(userData));
  }, [userData]);

  // Add auto-logout on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = JSON.parse(localStorage.getItem('marketplaceData'));
      if (data) {
        data.isLoggedIn = false;
        data.currentUser = null;
        localStorage.setItem('marketplaceData', JSON.stringify(data));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Add cleanup for expired locks every minute
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const data = JSON.parse(localStorage.getItem('marketplaceData'));
      if (data) {
        let changed = false;
        const newLockedAccounts = { ...data.lockedAccounts };
       
        Object.entries(newLockedAccounts).forEach(([username, lockInfo]) => {
          if (now - lockInfo.timestamp >= 600000) { // 10 minutes
            delete newLockedAccounts[username];
            changed = true;
          }
        });

        if (changed) {
          data.lockedAccounts = newLockedAccounts;
          data.loginAttempts = {};
          localStorage.setItem('marketplaceData', JSON.stringify(data));
          setUserData(data);
        }
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);
  const commonStyles = {
    pageContainer: {
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
      padding: '10px',
      boxSizing: 'border-box',
      width: '100%'
    },
    container: {
      padding: '10px',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      boxSizing: 'border-box'
    },
    input: {
      display: 'block',
      margin: '10px 0',
      padding: '12px',
      width: '100%',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '16px',
      boxSizing: 'border-box'
    },
    button: {
      margin: '5px 0',
      padding: '12px',
      cursor: 'pointer',
      borderRadius: '4px',
      border: 'none',
      backgroundColor: '#4299e1',
      color: 'white',
      width: '100%',
      fontSize: '16px',
      boxSizing: 'border-box'
    },
    card: {
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px',
      margin: '10px auto',
      boxSizing: 'border-box'
    },
    responsiveGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '15px',
      width: '100%'
    },
    flexBetween: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px'
    },
    responsiveButton: {
      padding: '10px 15px',
      borderRadius: '4px',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      minWidth: '100px',
      margin: '5px'
    },
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '400px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxSizing: 'border-box'
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  };

  // Helper function to check if account is locked
  const isAccountLocked = (username) => {
    const lockInfo = userData.lockedAccounts[username];
    if (!lockInfo) return false;
   
    const now = Date.now();
    if (now - lockInfo.timestamp < 600000) { // 10 minutes in milliseconds
      return true;
    }
   
    // Clean up expired lock
    setUserData(prev => ({
      ...prev,
      lockedAccounts: {
        ...prev.lockedAccounts,
        [username]: undefined
      },
      loginAttempts: {
        ...prev.loginAttempts,
        [username]: 0
      }
    }));
    return false;
  };

  const Auth = () => {
    const [authMode, setAuthMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('customer');
    const [adminStep, setAdminStep] = useState(0);
    const [adminPassword, setAdminPassword] = useState('');
    const [adminId, setAdminId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const incrementLoginAttempts = (user) => {
      setUserData(prev => {
        const currentAttempts = (prev.loginAttempts[user] || 0) + 1;
       
        if (currentAttempts >= 3) {
          // Lock the account
          return {
            ...prev,
            loginAttempts: {
              ...prev.loginAttempts,
              [user]: currentAttempts
            },
            lockedAccounts: {
              ...prev.lockedAccounts,
              [user]: {
                timestamp: Date.now()
              }
            }
          };
        }
       
        return {
          ...prev,
          loginAttempts: {
            ...prev.loginAttempts,
            [user]: currentAttempts
          }
        };
      });
    };

    const handleSubmit = () => {
      setErrorMessage('');

      // Check for account lock
      if (authMode === 'admin') {
        if (isAccountLocked('admin')) {
          setErrorMessage('Admin account is locked for 10 minutes due to too many failed attempts');
          return;
        }
      } else if (isAccountLocked(username)) {
        setErrorMessage(`Account ${username} is locked for 10 minutes due to too many failed attempts`);
        return;
      }

      if (authMode === 'admin') {
        if (adminStep === 0 && adminPassword === '129122325') {
          setAdminStep(1);
          setAdminPassword('');
        } else if (adminStep === 1 && adminId === '712256009') {
          handleLogin('admin');
        } else {
          incrementLoginAttempts('admin');
          setErrorMessage('Invalid admin credentials');
          if (adminStep === 1) setAdminStep(0);
        }
        return;
      }

      if (authMode === 'register') {
        if (username && password) {
          if (userData.users[username]) {
            setErrorMessage('Username already exists');
            return;
          }
          setUserData(prev => ({
            ...prev,
            users: {
              ...prev.users,
              [username]: {
                type: userType,
                credits: 0,
                password,
                pendingTransactions: [],
                products: userType === 'vendor' ? [] : undefined
              }
            }
          }));
          setAuthMode('login');
          setErrorMessage('Registration successful! Please login.');
          return;
        }
      }

      if (userData.users[username]?.password === password) {
        handleLogin(username);
      } else {
        incrementLoginAttempts(username);
        setErrorMessage('Invalid credentials');
      }
    };

    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.card}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>
            {authMode === 'admin' ? `Admin Access - Step ${adminStep + 1}` :
             authMode === 'register' ? 'Register' : 'Login'}
          </h2>
         
          {errorMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#FED7D7',
              color: '#C53030',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              {errorMessage}
            </div>
          )}

          {authMode === 'admin' ? (
            <div>
              {adminStep === 0 ? (
                <input
                  type="password"
                  placeholder="Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={commonStyles.input}
                />
              ) : (
                <input
                  type="password"
                  placeholder="Admin ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  style={commonStyles.input}
                />
              )}
            </div>
          ) : (
            <>
              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={commonStyles.input}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={commonStyles.input}
              />
              {authMode === 'register' && (
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  style={commonStyles.input}
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                </select>
              )}
            </>
          )}
         
          <button onClick={handleSubmit} style={commonStyles.button}>
            {authMode === 'admin' ? (adminStep === 0 ? 'Next' : 'Login') :
             authMode === 'register' ? 'Register' : 'Login'}
          </button>
         
          {authMode === 'admin' ? (
            <button
              onClick={() => {
                setAuthMode('login');
                setAdminStep(0);
                setAdminPassword('');
                setAdminId('');
                setErrorMessage('');
              }}
              style={{...commonStyles.button, backgroundColor: '#718096'}}
            >
              Back to Login
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setErrorMessage('');
                }}
                style={{...commonStyles.button, backgroundColor: '#48bb78'}}
              >
                {authMode === 'login' ? 'Register' : 'Back to Login'}
              </button>
              {authMode === 'login' && (
                <button
                  onClick={() => {
                    setAuthMode('admin');
                    setErrorMessage('');
                  }}
                  style={{...commonStyles.button, backgroundColor: '#718096'}}
                >
                  Admin Access
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  const AdminPanel = () => {
    const [showPasswords, setShowPasswords] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

    const handleDeleteUser = (username) => {
      if (deleteConfirm === username) {
        setUserData(prev => {
          const newUsers = { ...prev.users };
          delete newUsers[username];
          return {
            ...prev,
            users: newUsers
          };
        });
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(username);
      }
    };

    const handleWithdraw = () => {
      const amount = Number(withdrawAmount);
      if (amount > 0 && amount <= userData.adminBalance) {
        setUserData(prev => ({
          ...prev,
          adminBalance: prev.adminBalance - amount
        }));
        setWithdrawAmount('');
        setShowWithdrawDialog(false);
      } else {
        alert('Invalid withdraw amount');
      }
    };

    const togglePasswordVisibility = (username) => {
      setShowPasswords(prev => ({
        ...prev,
        [username]: !prev[username]
      }));
    };

    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.container}>
          <div style={commonStyles.card}>
            <div style={commonStyles.flexBetween}>
              <div>
                <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>Admin Panel</h1>
                <div style={{marginTop: '5px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <p style={{color: '#4299e1'}}>
                    Admin Balance: {userData.adminBalance} credits
                  </p>
                  <button
                    onClick={() => setShowWithdrawDialog(true)}
                    style={{...commonStyles.responsiveButton, backgroundColor: '#48bb78'}}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{...commonStyles.responsiveButton, backgroundColor: '#f56565'}}
              >
                Logout
              </button>
            </div>
           
            <div style={{marginTop: '20px'}}>
              {Object.entries(userData.users).map(([username, user]) => (
                <div key={username} style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <div style={commonStyles.flexBetween}>
                    <h3 style={{fontWeight: 'bold'}}>{username}</h3>
                    <div>
                      <button
                        onClick={() => togglePasswordVisibility(username)}
                        style={{
                          ...commonStyles.responsiveButton,
                          backgroundColor: '#4299e1',
                          marginRight: '5px'
                        }}
                      >
                        {showPasswords[username] ? 'Hide Password' : 'Show Password'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(username)}
                        style={{
                          ...commonStyles.responsiveButton,
                          backgroundColor: deleteConfirm === username ? '#f56565' : '#718096'
                        }}
                      >
                        {deleteConfirm === username ? 'Confirm Delete' : 'Delete User'}
                      </button>
                    </div>
                  </div>
                  <p>Type: {user.type}</p>
                  {showPasswords[username] && (
                    <p style={{
                      backgroundColor: '#F7FAFC',
                      padding: '5px',
                      borderRadius: '4px',
                      marginTop: '5px'
                    }}>
                      Password: {user.password}
                    </p>
                  )}
                  <div style={commonStyles.flexBetween}>
                    <span>Credits:</span>
                    <input
                      type="number"
                      value={user.credits}
                      onChange={(e) => {
                        setUserData(prev => ({
                          ...prev,
                          users: {
                            ...prev.users,
                            [username]: { ...user, credits: parseInt(e.target.value) || 0 }
                          }
                        }));
                      }}
                      style={{...commonStyles.input, width: '120px', margin: '0'}}
                    />
                  </div>
                 
                  {user.type === 'vendor' && user.products && (
                    <div style={{marginTop: '10px'}}>
                      <p style={{fontWeight: 'bold'}}>Products:</p>
                      {user.products.map(product => (
                        <div key={product.name} style={{
                          padding: '5px',
                          marginTop: '5px',
                          backgroundColor: '#F7FAFC',
                          borderRadius: '4px'
                        }}>
                          {product.name} - {product.price} credits
                        </div>
                      ))}
                    </div>
                  )}

                  {user.pendingTransactions && user.pendingTransactions.length > 0 && (
                    <div style={{marginTop: '10px'}}>
                      <p style={{fontWeight: 'bold'}}>Pending Transactions:</p>
                      {user.pendingTransactions.map(tx => (
                        <div key={tx.id} style={{
                          padding: '5px',
                          marginTop: '5px',
                          backgroundColor: '#F7FAFC',
                          borderRadius: '4px'
                        }}>
                          To: {tx.to} - Amount: {tx.amount} credits
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{marginTop: '20px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px'}}>Transaction Logs</h2>
              <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {userData.transactionLogs && userData.transactionLogs.slice().reverse().map(log => (
                  <div key={log.id} style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{marginBottom: '5px', color: '#4A5568', fontSize: '0.9em'}}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    {log.type === 'payment' ? (
                      <>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <span>From: {log.from}</span>
                          <span>To: {log.to}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '5px'}}>
                          <span>Amount: {log.amount} credits</span>
                          {log.status === 'completed' && (
                            <span>Admin Fee: {log.adminFee} credits</span>
                          )}
                        </div>
                        <div style={{
                          marginTop: '5px',
                          color: log.status === 'completed' ? '#48BB78' : '#F56565'
                        }}>
                          Status: {log.status}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>Admin Withdrawal</div>
                        <div style={{marginTop: '5px'}}>Amount: {log.amount} credits</div>
                        <div style={{
                          marginTop: '5px',
                          color: '#48BB78'
                        }}>
                          Status: {log.status}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {showWithdrawDialog && (
              <div style={commonStyles.overlay}>
                <div style={commonStyles.modal}>
                  <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px'}}>
                    Withdraw Credits
                  </h3>
                  <p style={{marginBottom: '10px'}}>
                    Available Balance: {userData.adminBalance} credits
                  </p>
                  <input
                    type="number"
                    placeholder="Amount to withdraw"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={commonStyles.input}
                    max={userData.adminBalance}
                    min="0"
                  />
                  <button
                    onClick={handleWithdraw}
                    style={commonStyles.button}
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => {
                      setShowWithdrawDialog(false);
                      setWithdrawAmount('');
                    }}
                    style={{...commonStyles.button, backgroundColor: '#718096'}}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const Marketplace = () => {
    const [showRequestDialog, setShowRequestDialog] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '' });
    const [customerUsername, setCustomerUsername] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [removeConfirm, setRemoveConfirm] = useState(null);
   
    const currentUser = userData.users[userData.currentUser];
    const vendors = Object.entries(userData.users).filter(([_, u]) => u.type === 'vendor');

    const handleRemoveProduct = (productName) => {
      if (removeConfirm === productName) {
        setUserData(prev => ({
          ...prev,
          users: {
            ...prev.users,
            [userData.currentUser]: {
              ...prev.users[userData.currentUser],
              products: prev.users[userData.currentUser].products.filter(p => p.name !== productName)
            }
          }
        }));
        setRemoveConfirm(null);
      } else {
        setRemoveConfirm(productName);
      }
    };

    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.container}>
          <div style={commonStyles.card}>
            <div style={commonStyles.flexBetween}>
              <div>
                <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>Welcome, {userData.currentUser}</h1>
                <p>Credits: {currentUser.credits}</p>
              </div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                {currentUser.type === 'vendor' && (
                  <button
                    onClick={() => setShowProfileEdit(!showProfileEdit)}
                    style={{...commonStyles.responsiveButton, backgroundColor: '#48bb78'}}
                  >
                    {showProfileEdit ? 'View Store' : 'Edit Profile'}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{...commonStyles.responsiveButton, backgroundColor: '#f56565'}}
                >
                  Logout
                </button>
              </div>
            </div>

            {currentUser.type === 'vendor' ? (
              <div style={{marginTop: '20px'}}>
                {!showProfileEdit ? (
                  <>
                    <div style={commonStyles.flexBetween}>
                      <h2 style={{fontSize: '20px', fontWeight: 'bold'}}>Your Store</h2>
                      <button
                        onClick={() => setShowRequestDialog(true)}
                        style={{...commonStyles.responsiveButton, backgroundColor: '#4299e1'}}
                      >
                        Request Payment
                      </button>
                    </div>
                    <div style={commonStyles.responsiveGrid}>
                      {currentUser.products?.map(product => (
                        <div key={product.name} style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}>
                          <div style={commonStyles.flexBetween}>
                            <div>
                              <p style={{fontWeight: 'bold'}}>{product.name}</p>
                              <p>{product.price} credits</p>
                            </div>
                            <button
                              onClick={() => handleRemoveProduct(product.name)}
                              style={{
                                ...commonStyles.responsiveButton,
                                backgroundColor: removeConfirm === product.name ? '#f56565' : '#718096'
                              }}
                            >
                              {removeConfirm === product.name ? 'Confirm Remove' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{marginTop: '20px'}}>
                    <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px'}}>Add New Product</h2>
                    <div style={commonStyles.flexBetween}>
                      <input
                        placeholder="Product Name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        style={{...commonStyles.input, flex: 1}}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        style={{...commonStyles.input, width: '120px'}}
                      />
                      <button
                        onClick={() => {
                          if (newProduct.name && newProduct.price) {
                            setUserData(prev => ({
                              ...prev,
                              users: {
                                ...prev.users,
                                [userData.currentUser]: {
                                  ...prev.users[userData.currentUser],
                                  products: [
                                    ...(prev.users[userData.currentUser].products || []),
                                    { name: newProduct.name, price: Number(newProduct.price) }
                                  ]
                                }
                              }
                            }));
                            setNewProduct({ name: '', price: '' });
                          }
                        }}
                        style={{...commonStyles.responsiveButton, backgroundColor: '#48bb78'}}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{marginTop: '20px'}}>
                <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px'}}>Available Vendors</h2>
                <div style={commonStyles.responsiveGrid}>
                  {vendors.map(([vendorName, vendor]) => (
                    <div key={vendorName} style={{
                      padding: '15px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>
                      <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '10px'}}>{vendorName}'s Shop</h3>
                      {vendor.products?.map(product => (
                        <div key={product.name} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '5px 0',
                          borderBottom: '1px solid #eee'
                        }}>
                          <span>{product.name}</span>
                          <span>{product.price} credits</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {currentUser.pendingTransactions?.length > 0 && (
                  <div style={{marginTop: '20px'}}>
                    <h2 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '15px'}}>Pending Payments</h2>
                    {currentUser.pendingTransactions.map(tx => (
                      <div key={tx.id} style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}>
                        <div style={commonStyles.flexBetween}>
                          <div>
                            <p>From: {tx.to}</p>
                            <p>Amount: {tx.amount} credits</p>
                          </div>
                          <div>
                            <button
                              onClick={() => handleTransaction(tx, true)}
                              style={{...commonStyles.responsiveButton, backgroundColor: '#4299e1'}}
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => handleTransaction(tx, false)}
                              style={{...commonStyles.responsiveButton, backgroundColor: '#718096'}}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showRequestDialog && (
              <div style={commonStyles.overlay}>
                <div style={commonStyles.modal}>
                  <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px'}}>Request Payment</h3>
                  <input
                    placeholder="Customer Username"
                    value={customerUsername}
                    onChange={(e) => setCustomerUsername(e.target.value)}
                    style={commonStyles.input}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={commonStyles.input}
                  />
                  <button
                    onClick={() => {
                      if (userData.users[customerUsername]?.type === 'customer' && paymentAmount) {
                        setUserData(prev => ({
                          ...prev,
                          users: {
                            ...prev.users,
                            [customerUsername]: {
                              ...prev.users[customerUsername],
                              pendingTransactions: [
                                ...(prev.users[customerUsername].pendingTransactions || []),
                                {
                                  from: customerUsername,
                                  to: userData.currentUser,
                                  amount: Number(paymentAmount),
                                  id: Date.now()
                                }
                              ]
                            }
                          }
                        }));
                        setShowRequestDialog(false);
                        setCustomerUsername('');
                        setPaymentAmount('');
                        alert('Payment requested');
                      }
                    }}
                    style={commonStyles.button}
                  >
                    Request
                  </button>
                  <button
                    onClick={() => {
                      setShowRequestDialog(false);
                      setCustomerUsername('');
                      setPaymentAmount('');
                    }}
                    style={{...commonStyles.button, backgroundColor: '#718096'}}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleLogin = (username) => {
    const loginData = {
      isLoggedIn: true,
      currentUser: username,
      loginAttempts: {
        ...userData.loginAttempts,
        [username]: 0
      }
    };

    setUserData(prev => ({
      ...prev,
      ...loginData
    }));

    const currentData = JSON.parse(localStorage.getItem('marketplaceData'));
    localStorage.setItem('marketplaceData', JSON.stringify({
      ...currentData,
      ...loginData
    }));
  };

  const handleLogout = () => {
    const logoutData = {
      isLoggedIn: false,
      currentUser: null
    };

    setUserData(prev => ({
      ...prev,
      ...logoutData
    }));

    const currentData = JSON.parse(localStorage.getItem('marketplaceData'));
    localStorage.setItem('marketplaceData', JSON.stringify({
      ...currentData,
      ...logoutData
    }));
  };

  const handleTransaction = (tx, accept) => {
    if (accept && userData.users[tx.from].credits >= tx.amount) {
      setUserData(prev => {
        const adminFee = Math.floor(tx.amount * 0.02); // 2% fee
        const vendorAmount = tx.amount - adminFee;
        
        return {
          ...prev,
          adminBalance: prev.adminBalance + adminFee,
          users: {
            ...prev.users,
            [tx.from]: {
              ...prev.users[tx.from],
              credits: prev.users[tx.from].credits - tx.amount,
              pendingTransactions: prev.users[tx.from].pendingTransactions.filter(t => t.id !== tx.id)
            },
            [tx.to]: {
              ...prev.users[tx.to],
              credits: prev.users[tx.to].credits + vendorAmount
            }
          }
        };
      });
    } else if (!accept) {
      setUserData(prev => ({
        ...prev,
        users: {
          ...prev.users,
          [tx.from]: {
            ...prev.users[tx.from],
            pendingTransactions: prev.users[tx.from].pendingTransactions.filter(t => t.id !== tx.id)
          }
        }
      }));
    }
  };

  return userData.isLoggedIn ? (
    userData.currentUser === 'admin' ? <AdminPanel /> : <Marketplace />
  ) : (
    <Auth />
  );
}

export default App;
