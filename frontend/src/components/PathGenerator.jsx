import React, { useState } from 'react'
import { useLearningPath } from '../hooks/useLearningPath'

export const PathGenerator = () => {
  const { generateWithAI, loading, error } = useLearningPath()
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [goals, setGoals] = useState('')
  const [generated, setGenerated] = useState(null)

  const handleGenerate = async (e) => {
    e.preventDefault()
    try {
      const result = await generateWithAI(topic, difficulty, goals)
      setGenerated(result)
    } catch (err) {
      console.error('Generate error:', err)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Generate Learning Path</h2>
      
      <form onSubmit={handleGenerate} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Machine Learning, Python, Web Development"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Difficulty Level</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Goals (Optional)</label>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="What do you want to achieve?"
            className="w-full px-4 py-2 border rounded-lg h-24"
          />
        </div>

        {error && <div className="text-red-500">{error}</div>}

        <button
          type="submit"
          disabled={loading || !topic}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate Path'}
        </button>
      </form>

      {generated && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Generated Path</h3>
          <p className="text-sm text-gray-600 mb-2">Topic: {generated.topic}</p>
          <p className="text-sm text-gray-600 mb-4">Difficulty: {generated.difficulty_level}</p>
          <div className="bg-white p-4 rounded border border-gray-200 whitespace-pre-wrap text-sm">
            {generated.content}
          </div>
        </div>
      )}
    </div>
  )
}
