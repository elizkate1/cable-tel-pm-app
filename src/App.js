import React, { useState, useEffect, createContext, useContext } from 'react';
// ALL FIREBASE IMPORTS MUST BE AT THE TOP LEVEL OF THE FILE
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics"; // Added getAnalytics import

// Create a context for Firebase services
const FirebaseContext = createContext(null);

// Firebase Provider Component
function FirebaseProvider({ children }) {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Your web app's Firebase configuration
        // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        const firebaseConfig = {
          apiKey: "AIzaSyAwiRS-CCOBnUbAJ4UbRbG9hNKh-oZaBnM",
          authDomain: "cable-tel-services-pm-tool.firebaseapp.com",
          projectId: "cable-tel-services-pm-tool", // This will also be used as canvasAppId
          storageBucket: "cable-tel-services-pm-tool.firebasestorage.app",
          messagingSenderId: "627983772557",
          appId: "1:627983772557:web:d358cccdbbc6b388b62bc4",
          measurementId: "G-CT2214WYCQ"
        };

        // Using the Firebase projectId as the unique identifier for data within Firestore
        const canvasAppId = firebaseConfig.projectId; // This is crucial for data path in Firestore
        const initialAuthToken = null; // Keeping null for anonymous sign-in as discussed

        if (!firebaseConfig.apiKey) {
          throw new Error("Firebase config is missing API key. Please ensure it's set.");
        }

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        // Initialize Analytics (optional, but included as per your request)
        const analytics = getAnalytics(app); // Initialized analytics

        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        // Sign in with custom token if available, otherwise anonymously
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Listen for auth state changes to get the user ID
        onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            // If user signs out or token expires, generate a random ID for anonymous use
            setUserId(crypto.randomUUID());
          }
          setLoadingFirebase(false);
        });

      } catch (err) {
        console.error("Failed to initialize Firebase:", err);
        setError(err.message);
        setLoadingFirebase(false);
      }
    };

    initFirebase();
  }, []); // Run only once on component mount

  if (loadingFirebase) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading application...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800 p-4 rounded-lg">
        Error initializing application: {error}. Please ensure Firebase is configured correctly.
      </div>
    );
  }

  // Pass the canvasAppId to the context provider
  return (
    <FirebaseContext.Provider value={{ db, auth, userId, appId: db ? db.app.options.projectId : 'default-fiber-pm-app' }}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to use Firebase services
function useFirebase() {
  return useContext(FirebaseContext);
}

// Project Data Model (Simplified)
// In a real app, these would be more complex and normalized
const initialProjects = []; // Will be loaded from Firestore

// Main App Component
function App() {
  const { db, userId, appId } = useFirebase();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [currentProjectForTask, setCurrentProjectForTask] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeView, setActiveView] = useState('list'); // 'list' or 'detail'

  // Firestore collection reference for projects
  const getProjectsCollectionRef = () => {
    // Using public data path as per instructions
    return collection(db, `artifacts/${appId}/public/data/projects`);
  };

  // Fetch projects from Firestore
  useEffect(() => {
    if (!db || !userId) return;

    const q = query(getProjectsCollectionRef(), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
      setLoadingProjects(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoadingProjects(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [db, userId, appId]); // Depend on db, userId, and appId

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setActiveView('detail');
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
    setActiveView('list');
    setShowProjectForm(false); // Hide form if navigating back
    setShowTaskForm(false); // Hide task form if navigating back
  };

  const handleAddProject = () => {
    setShowProjectForm(true);
    setActiveView('form');
  };

  const handleAddTask = (projectId) => {
    setCurrentProjectForTask(projectId);
    setShowTaskForm(true);
    setActiveView('taskForm');
  };

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      {/* Header */}
      {/* Changed header background to reflect Cable Tel Services, Inc. logo colors */}
      <header className="bg-[#003366] text-white p-4 shadow-lg"> {/* Dark Blue from logo */}
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Cable Tel Services, Inc. Project Management Tool</h1>
          {userId && (
            <div className="text-sm">
              User ID: <span className="font-mono bg-[#0056b3] px-2 py-1 rounded-md"> {/* Slightly lighter blue for contrast */}
                {userId}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto p-6">
        {activeView === 'list' && (
          <ProjectListView
            projects={projects}
            onSelectProject={handleSelectProject}
            onAddProject={handleAddProject}
          />
        )}

        {activeView === 'detail' && selectedProjectId && (
          <ProjectDetailView
            projectId={selectedProjectId}
            onBack={handleBackToList}
            onAddTask={handleAddTask}
          />
        )}

        {activeView === 'form' && showProjectForm && (
          <ProjectForm onSave={() => { setShowProjectForm(false); setActiveView('list'); }} onCancel={() => { setShowProjectForm(false); setActiveView('list'); }} />
        )}

        {activeView === 'taskForm' && showTaskForm && currentProjectForTask && (
          <TaskForm
            projectId={currentProjectForTask}
            onSave={() => { setShowTaskForm(false); setActiveView('detail'); }}
            onCancel={() => { setShowTaskForm(false); setActiveView('detail'); }}
          />
        )}
      </main>
    </div>
  );
}

// Project List View Component
function ProjectListView({ projects, onSelectProject, onAddProject }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-gray-800">Fiber Optic Projects</h2>
        <button
          onClick={onAddProject}
          // Changed button color to reflect Cable Tel Services, Inc. logo green
          className="bg-[#33cc33] hover:bg-[#28a428] text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        >
          + Add New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-600 text-lg text-center py-10">No projects found. Start by adding one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1"
              onClick={() => onSelectProject(project.id)}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  // Adjusted status badge colors to complement the new theme
                  project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
                {project.createdAt && (
                  <span className="ml-auto text-gray-500">
                    Created: {new Date(project.createdAt.toDate()).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Project Detail View Component
function ProjectDetailView({ projectId, onBack, onAddTask }) {
  const { db, appId } = useFirebase();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showEditProjectForm, setShowEditProjectForm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // State for confirmation modal

  // Firestore collection references
  const getProjectsCollectionRef = () => collection(db, `artifacts/${appId}/public/data/projects`);
  const getTasksCollectionRef = (projId) => collection(db, `artifacts/${appId}/public/data/projects/${projId}/tasks`);

  // Fetch project details
  useEffect(() => {
    if (!db || !projectId) return;

    const docRef = doc(getProjectsCollectionRef(), projectId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such project!");
        setProject(null);
      }
      setLoadingProject(false);
    }, (error) => {
      console.error("Error fetching project details:", error);
      setLoadingProject(false);
    });

    return () => unsubscribe();
  }, [db, projectId, appId]);

  // Fetch tasks for the project
  useEffect(() => {
    if (!db || !projectId) return;

    const q = query(getTasksCollectionRef(projectId), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
      setLoadingTasks(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setLoadingTasks(false);
    });

    return () => unsubscribe();
  }, [db, projectId, appId]);

  const handleDeleteProject = async () => {
    try {
      if (project) {
        // Delete all tasks first
        const taskDocs = await getDocs(getTasksCollectionRef(project.id));
        const deletePromises = taskDocs.docs.map(tDoc => deleteDoc(doc(getTasksCollectionRef(project.id), tDoc.id)));
        await Promise.all(deletePromises);

        // Then delete the project
        await deleteDoc(doc(getProjectsCollectionRef(), project.id));
        onBack(); // Go back to list after deletion
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setShowConfirmDelete(false); // Close modal
    }
  };

  if (loadingProject || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-700">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-xl">
        <p className="text-red-500 text-lg mb-4">Project not found.</p>
        <button
          onClick={onBack}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Projects
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowEditProjectForm(true)}
            // Changed button color to reflect Cable Tel Services, Inc. logo green
            className="bg-[#33cc33] hover:bg-[#28a428] text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Edit Project
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Delete Project
          </button>
        </div>
      </div>

      {showEditProjectForm ? (
        <ProjectForm
          projectToEdit={project}
          onSave={() => setShowEditProjectForm(false)}
          onCancel={() => setShowEditProjectForm(false)}
        />
      ) : (
        <>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{project.name}</h2>
          <p className="text-gray-700 text-lg mb-6">{project.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 font-semibold">Status:</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'Planned' ? 'bg-blue-200 text-blue-900' :
                project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 font-semibold">Created At:</p>
              <p className="text-gray-700">{project.createdAt ? new Date(project.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
            </div>
            {/* Placeholder for Geospatial Data */}
            <div className="bg-blue-50 p-4 rounded-lg md:col-span-2">
              <p className="text-blue-800 font-semibold mb-2">Geospatial Overview (Placeholder):</p>
              <img
                src="https://placehold.co/600x200/e0e7ff/4338ca?text=Map+View+Placeholder"
                alt="Map Placeholder"
                className="w-full h-48 object-cover rounded-md border border-blue-200"
                onError={(e) => e.target.src = "https://placehold.co/600x200/cccccc/333333?text=Image+Load+Error"}
              />
              <p className="text-sm text-gray-600 mt-2">
                (In a real application, this would be an interactive map displaying fiber routes, splice points, and assets.)
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-4">Tasks</h3>
          <button
            onClick={() => onAddTask(project.id)}
            // Changed button color to reflect Cable Tel Services, Inc. logo green
            className="bg-[#33cc33] hover:bg-[#28a428] text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 mb-6"
          >
            + Add New Task
          </button>

          {tasks.length === 0 ? (
            <p className="text-gray-600 text-center py-5">No tasks for this project yet. Add the first one!</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tasks.map(task => (
                <TaskItem key={task.id} task={task} projectId={project.id} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal for Deletion */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this project and all its tasks? This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Project Form Component (Add/Edit)
function ProjectForm({ projectToEdit, onSave, onCancel }) {
  const { db, appId } = useFirebase();
  const [name, setName] = useState(projectToEdit?.name || '');
  const [description, setDescription] = useState(projectToEdit?.description || '');
  const [status, setStatus] = useState(projectToEdit?.status || 'Planned');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isEditing = !!projectToEdit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!db) {
      setMessage('Database not initialized.');
      setLoading(false);
      return;
    }

    if (!name || !description) {
      setMessage('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const projectData = {
        name,
        description,
        status,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectToEdit.id);
        await updateDoc(projectRef, projectData);
        setMessage('Project updated successfully!');
      } else {
        projectData.createdAt = serverTimestamp();
        await addDoc(collection(db, `artifacts/${appId}/public/data/projects`), projectData);
        setMessage('Project added successfully!');
        setName('');
        setDescription('');
        setStatus('Planned');
      }
      onSave(); // Call the onSave callback to close the form
    } catch (error) {
      console.error("Error saving project:", error);
      setMessage(`Error saving project: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6">{isEditing ? 'Edit Project' : 'Add New Project'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Project Name:
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            rows="4"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={loading}
          ></textarea>
        </div>
        <div className="mb-6">
          <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
            Status:
          </label>
          <select
            id="status"
            className="shadow border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
          >
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
        {message && (
          <p className={`text-sm mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            // Changed button color to reflect Cable Tel Services, Inc. logo green
            className="bg-[#33cc33] hover:bg-[#28a428] text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Project' : 'Add Project')}
          </button>
        </div>
      </form>
    </div>
  );
}

// Task Item Component
function TaskItem({ task, projectId }) {
  const { db, appId } = useFirebase();
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Firestore collection reference for tasks
  const getTasksCollectionRef = (projId) => collection(db, `artifacts/${appId}/public/data/projects/${projId}/tasks`);

  const handleDeleteTask = async () => {
    try {
      await deleteDoc(doc(getTasksCollectionRef(projectId), task.id));
      console.log("Task deleted successfully!");
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setShowConfirmDelete(false); // Close modal
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm mb-4">
      {isEditing ? (
        <TaskForm
          projectId={projectId}
          taskToEdit={task}
          onSave={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">{task.name}</h4>
          <p className="text-sm text-gray-600 mb-2">Assigned To: <span className="font-medium">{task.assignedTo || 'Unassigned'}</span></p>
          <p className="text-sm text-gray-600 mb-2">Materials: <span className="font-medium">{task.materialsNeeded || 'None'}</span></p>
          <div className="flex items-center text-sm text-gray-500">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              task.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
              task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
              task.status === 'Completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status}
            </span>
            {task.createdAt && (
              <span className="ml-auto text-gray-500">
                Created: {new Date(task.createdAt.toDate()).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setIsEditing(true)}
              // Changed button color to reflect Cable Tel Services, Inc. logo green
              className="text-[#33cc33] hover:text-[#28a428] font-medium text-sm transition duration-300"
            >
              Edit
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-red-600 hover:text-red-800 font-medium text-sm transition duration-300"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Confirmation Modal for Deletion */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Task Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Task Form Component (Add/Edit)
function TaskForm({ projectId, taskToEdit, onSave, onCancel }) {
  const { db, appId } = useFirebase();
  const [name, setName] = useState(taskToEdit?.name || '');
  const [assignedTo, setAssignedTo] = useState(taskToEdit?.assignedTo || '');
  const [status, setStatus] = useState(taskToEdit?.status || 'Planned');
  const [materialsNeeded, setMaterialsNeeded] = useState(taskToEdit?.materialsNeeded || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isEditing = !!taskToEdit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!db) {
      setMessage('Database not initialized.');
      setLoading(false);
      return;
    }

    if (!name) {
      setMessage('Task name is required.');
      setLoading(false);
      return;
    }

    try {
      const taskData = {
        name,
        assignedTo,
        status,
        materialsNeeded,
        updatedAt: serverTimestamp(),
      };

      const tasksCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${projectId}/tasks`);

      if (isEditing) {
        const taskRef = doc(tasksCollectionRef, taskToEdit.id);
        await updateDoc(taskRef, taskData);
        setMessage('Task updated successfully!');
      } else {
        taskData.createdAt = serverTimestamp();
        await addDoc(tasksCollectionRef, taskData);
        setMessage('Task added successfully!');
        setName('');
        setAssignedTo('');
        setStatus('Planned');
        setMaterialsNeeded('');
      }
      onSave(); // Call the onSave callback to close the form
    } catch (error) {
      console.error("Error saving task:", error);
      setMessage(`Error saving task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl border border-blue-100">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">{isEditing ? 'Edit Task' : 'Add New Task'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="taskName" className="block text-gray-700 text-sm font-bold mb-2">
            Task Name:
          </label>
          <input
            type="text"
            id="taskName"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="assignedTo" className="block text-gray-700 text-sm font-bold mb-2">
            Assigned To (e.g., Crew A, John Doe):
          </label>
          <input
            type="text"
            id="assignedTo"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="taskStatus" className="block text-gray-700 text-sm font-bold mb-2">
            Status:
          </label>
          <select
            id="taskStatus"
            className="shadow border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
          >
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
        <div className="mb-6">
          <label htmlFor="materialsNeeded" className="block text-gray-700 text-sm font-bold mb-2">
            Materials Needed (e.g., 500ft fiber, 2 splice closures):
          </label>
          <textarea
            id="materialsNeeded"
            rows="2"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#33cc33] focus:border-transparent" // Green focus ring
            value={materialsNeeded}
            onChange={(e) => setMaterialsNeeded(e.target.value)}
            disabled={loading}
          ></textarea>
        </div>
        {message && (
          <p className={`text-sm mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            // Changed button color to reflect Cable Tel Services, Inc. logo green
            className="bg-[#33cc33] hover:bg-[#28a428] text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Task' : 'Add Task')}
          </button>
        </div>
      </form>
    </div>
  );
}

// Wrap the main App component with the FirebaseProvider
export default function WrappedApp() {
  return (
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  );
}

