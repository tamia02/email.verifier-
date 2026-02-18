import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const Dashboard = ({ jobId, onReset }) => {
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let interval;
        const fetchJob = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://email-verifier-backend-6slt.onrender.com';
                const res = await axios.get(`${apiUrl}/job/${jobId}`);
                setJob(res.data);
                if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED' || res.data.status === 'CANCELLED') {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Error fetching job", err);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
        interval = setInterval(fetchJob, 2000); // Poll every 2s

        return () => clearInterval(interval);
    }, [jobId]);

    if (loading && !job) return <div className="text-center mt-10 text-slate-400 animate-pulse">Initializing Dashboard...</div>;
    if (!job) return <div className="text-center mt-10 text-red-400">Job not found</div>;

    const progress = job.total_emails > 0 ? (job.processed_emails / job.total_emails) * 100 : 0;

    const downloadUrl = (type) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://email-verifier-backend-6slt.onrender.com';
        return `${apiUrl}/job/${jobId}/download/${type}`;
    };

    return (
        <div className="w-full max-w-5xl mx-auto mt-4 px-2">

            {/* Header / Meta */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${job.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            job.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                            {job.status === 'PROCESSING' && <span className="w-2 h-2 mr-2 bg-blue-400 rounded-full animate-pulse"></span>}
                            {job.status}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">{jobId.split('-')[0]}</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-100">
                        {job.status === 'PROCESSING' ? 'Verifying Emails...' : 'Verification Complete'}
                    </h2>
                </div>
                <button
                    onClick={onReset}
                    className="text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all shadow-lg"
                >
                    New Search
                </button>
            </div>

            {/* Progress Area */}
            <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50 mb-12 backdrop-blur-sm relative overflow-hidden">
                <div className="flex justify-between mb-4">
                    <span className="text-slate-400 font-medium text-sm">Progress</span>
                    <span className="text-slate-200 font-bold tabular-nums">
                        {Math.floor(progress)}%
                        <span className="text-slate-500 font-normal ml-2 text-sm">({job.processed_emails} / {job.total_emails})</span>
                    </span>
                </div>

                <div className="w-full bg-slate-700/50 rounded-full h-4 overflow-hidden relative">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-[length:200%_100%] animate-gradient-x relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                    </motion.div>
                </div>
            </div>

            {/* Results Grid - Only show when mostly done or completed */}
            {job.status === 'COMPLETED' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-10"
                >
                    {/* Primary CTA */}
                    <div className="flex justify-center">
                        <a
                            href={downloadUrl('cleaned')}
                            download={`cleaned_${job.filename}`}
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full focus:outline-none hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:scale-105"
                        >
                            <svg className="w-6 h-6 mr-3 -ml-1 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Download Cleaned List
                        </a>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <DownloadCard
                            title="Valid"
                            count="Safe to Send"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                            color="from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40"
                            url={downloadUrl('valid')}
                        />
                        <DownloadCard
                            title="Invalid"
                            count="Bounced / Bad"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                            color="from-red-500/20 to-rose-500/10 text-red-400 border-red-500/20 hover:border-red-500/40"
                            url={downloadUrl('invalid')}
                        />
                        <DownloadCard
                            title="Catch-All"
                            count="Accepts All"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
                            color="from-yellow-500/20 to-amber-500/10 text-yellow-400 border-yellow-500/20 hover:border-yellow-500/40"
                            url={downloadUrl('catch_all')}
                        />
                        <DownloadCard
                            title="Risky"
                            count="Unknown / Role"
                            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                            color="from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/20 hover:border-orange-500/40"
                            url={downloadUrl('risky')}
                        />
                    </div>

                    <div className="text-center pt-8 border-t border-slate-800">
                        <a href={downloadUrl('all')} className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download full raw results
                        </a>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const DownloadCard = ({ title, count, icon, color, url }) => (
    <a
        href={url}
        download
        className={`flex flex-col items-start p-6 rounded-2xl border transition-all duration-300 bg-gradient-to-br hover:-translate-y-1 hover:shadow-lg backdrop-blur-md ${color}`}
    >
        <div className="mb-4 p-3 rounded-xl bg-slate-900/50 border border-white/5">
            {icon}
        </div>
        <h3 className="font-bold text-xl text-slate-200">{title}</h3>
        <p className="text-sm opacity-80 font-medium mt-1">{count}</p>
    </a>
);
export default Dashboard;
