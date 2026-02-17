import React, { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';

function App() {
  const [currentJob, setCurrentJob] = useState(null);

  const handleJobCreated = (job) => {
    setCurrentJob(job.id);
  };

  const handleReset = () => {
    setCurrentJob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 tracking-tight sm:text-6xl mb-4">
            Email Verifier
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600">
            Bulk verify your email lists with high accuracy. <br />
            <span className="text-sm text-slate-400 font-medium tracking-wider uppercase mt-2 block">Powered by Python & FastAPI</span>
          </p>
        </header>

        <main className="relative z-10">
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 md:p-12">
            {!currentJob ? (
              <Upload onJobCreated={handleJobCreated} />
            ) : (
              <Dashboard jobId={currentJob} onReset={handleReset} />
            )}
          </div>
        </main>

        <footer className="mt-12 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Email Verifier Pro. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default App;
