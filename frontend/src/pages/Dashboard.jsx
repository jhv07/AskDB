import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import TextType from '../components/TextType';

// Components
import ResultRenderer from '../components/ResultRenderer';
import QueryHistoryPanel from '../components/QueryHistoryPanel';
import QueryPipelineVisualizer from '../components/QueryPipelineVisualizer';
import ExecutionComparison from '../components/ExecutionComparison';

// Simulated Services (For Demo)
import { detectIntent } from '../services/intentService';
import { mapSchema } from '../services/schemaMapper';
import { generateQuery } from '../services/queryGenerator';
import { validateQuery } from '../services/queryValidator';
import { analyzeRisk } from '../services/riskAnalyzer';
import { optimizeQuery } from '../services/optimizationEngine';
import { simulateExecution } from '../services/executionSimulator';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [activeQuery, setActiveQuery] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [pipelineComplete, setPipelineComplete] = useState(true);
  const [inputText, setInputText] = useState("");

  const handleSimulateFullFlow = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userQuery = inputText;
    setIsProcessing(true);
    setPipelineComplete(false);
    setActiveQuery(null);

    try {
      // 1. Intent Detection
      setCurrentStep('intent');
      const intentData = await detectIntent(userQuery);

      // 2. Schema Mapping
      setCurrentStep('schema');
      const schemaData = await mapSchema(intentData, userQuery);

      // 3. Query Generation
      setCurrentStep('generate');
      const queryObject = await generateQuery(schemaData, userQuery);

      // 4. Validation
      setCurrentStep('validate');
      await validateQuery(queryObject);

      // 5. Risk Analysis
      setCurrentStep('risk');
      const risk = await analyzeRisk(queryObject);

      // 6. Optimization
      setCurrentStep('optimization');
      const optimization = await optimizeQuery(queryObject);

      // 7. Execution Engine
      setCurrentStep('execution');
      const executionData = await simulateExecution(queryObject);

      // Compilation
      const finalResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        userQuery,
        queryObject,
        result: executionData.result,
        mongoExecutionTime: executionData.executionTimeMongo,
        sqlExecutionTime: executionData.executionTimeSQL,
        risk: risk,
        optimization: optimization,
        breakdownSteps: [
          `Detected intent: ${intentData.intent}`,
          `Mapped target collection: ${schemaData.targetCollection}`,
          `Generated native MongoDB payload.`,
          `Successfully validated execution integrity.`,
          `Executed on database in ${executionData.executionTimeMongo}ms.`
        ]
      };

      setHistory(prev => [finalResult, ...prev].slice(0, 20));
      setActiveQuery(finalResult);
      setPipelineComplete(true);
      setInputText("");

    } catch (error) {
      console.error("Simulation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Setup initial mock context
  useEffect(() => {
    if (history.length === 0) {
      const mockQuery = "Show me active students with marks over 50";
      setInputText(mockQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background ambient light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar History Panel */}
      <QueryHistoryPanel
        history={history}
        activeQueryId={activeQuery?.id}
        onSelectQuery={(q) => {
          setActiveQuery(q);
          setPipelineComplete(true);
          setCurrentStep(null);
        }}
      />

      {/* Main Content Dashboard */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">

        {/* Header Ribbon */}
        <header className="px-8 pt-6 pb-2 shrink-0 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <TextType
              text="AskDB"
              typingSpeed={120}
              deletingSpeed={70}
              pauseDuration={1200}
              loop={true}
              showCursor={false}
              className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 tracking-tight drop-shadow-[0_0_12px_rgba(59,130,246,0.25)]"
            />
          </motion.div>

          {/* User Profile Area */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-bold text-slate-200">{user?.username || 'Analyst'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">{user?.role || 'Admin'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-inner ring-2 ring-slate-800">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <button
              onClick={logout}
              className="ml-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold rounded-lg border border-slate-700 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Input Form & Visualizer Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-10 pt-4 space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Left Column: Input + Results */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Search Input Box */}
              <form onSubmit={handleSimulateFullFlow} className="relative w-full">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask your database anything..."
                  className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl py-4 pl-5 pr-14 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner text-lg transition-all disabled:opacity-50"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputText.trim()}
                  className="absolute right-3 top-3 bottom-3 bg-blue-600 hover:bg-blue-500 text-white p-2 w-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <span className="text-xl -mt-0.5">↳</span>
                  )}
                </button>
              </form>

              {/* Analysis Dashboard */}
              <AnimatePresence mode="wait">
                {activeQuery ? (
                  <motion.div
                    key={activeQuery.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-6 pb-20"
                  >
                    {/* Performance Comparison Bar */}
                    <ExecutionComparison mongoTime={activeQuery.mongoExecutionTime} sqlTime={activeQuery.sqlExecutionTime} />

                    {/* The sophisticated Result Renderer */}
                    <ResultRenderer data={{
                      queryObject: activeQuery.queryObject,
                      result: activeQuery.result,
                      execution_time: activeQuery.mongoExecutionTime,
                      breakdownSteps: activeQuery.breakdownSteps
                    }} />
                  </motion.div>
                ) : (
                  !isProcessing && (
                    <div className="text-center py-20 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/60 rounded-xl">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl mb-4 border border-slate-700">💬</div>
                      <h3 className="text-lg font-medium text-slate-300">Describe what you want to find</h3>
                      <p className="text-slate-500 text-sm mt-2 max-w-sm">Use natural language to intelligently query your MongoDB schemas with real-time insight generation.</p>
                    </div>
                  )
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: AI Pipeline Visualizer */}
            <div className="lg:col-span-1 border border-slate-800/60 rounded-xl overflow-hidden shadow-sm bg-slate-900/60 backdrop-blur-md">
              <div className="sticky top-0">
                <QueryPipelineVisualizer currentStep={currentStep} isComplete={pipelineComplete} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
}
