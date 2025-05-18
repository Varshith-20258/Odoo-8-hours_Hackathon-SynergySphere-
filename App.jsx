import React, { useState, useEffect, useContext, createContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import './App.css'; // responsive styles included

// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Contexts
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
function useAuth() { return useContext(AuthContext); }

// Components

// Login & Signup Form
function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const toggleMode = () => {
    setError('');
    setIsSignup(prev => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isSignup ? "Sign Up" : "Log In"}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" required onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required onChange={e => setPassword(e.target.value)} />
        <button type="submit">{isSignup ? "Sign Up" : "Log In"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button onClick={toggleMode} className="toggle-btn">
        {isSignup ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
}

// Task Management Component
function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
    });
    return unsubscribe;
  }, [user]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    await addDoc(collection(db, "tasks"), {
      uid: user.uid,
      text: newTask,
      completed: false,
      createdAt: serverTimestamp()
    });
    setNewTask('');
  };

  const toggleComplete = async (task) => {
    const taskRef = doc(db, "tasks", task.id);
    await updateDoc(taskRef, { completed: !task.completed });
  };

  const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  return (
    <div className="tasks-container">
      <h3>Your Tasks</h3>
      <div className="task-input">
        <input 
          type="text" 
          placeholder="New task" 
          value={newTask} 
          onChange={e => setNewTask(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask}>Add</button>
      </div>
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className={task.completed ? "completed" : ""}>
            <input 
              type="checkbox" 
              checked={task.completed} 
              onChange={() => toggleComplete(task)} 
            />
            {task.text}
            <button className="delete-btn" onClick={() => deleteTask(task.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Main App Component
export default function App() {
  const { user } = useAuth();

  const handleLogout = () => signOut(auth);

  return (
    <AuthProvider>
      <div className="app">
        <header>
          <h1>SynergySphere</h1>
          {user && <button onClick={handleLogout} className="logout-btn">Logout</button>}
        </header>
        <main>
          {user ? <Tasks /> : <AuthForm />}
        </main>
      </div>
    </AuthProvider>
  );
}
