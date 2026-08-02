import { useState } from 'react'
import { learningPathAPI, aiAPI } from '../utils/api'

export const useLearningPath = () => {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPaths = async () => {
    setLoading(true)
    try {
      const response = await learningPathAPI.getAll()
      setPaths(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createPath = async (pathData) => {
    setLoading(true)
    try {
      const response = await learningPathAPI.create(pathData)
      setPaths([...paths, response.data])
      return response.data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const generateWithAI = async (topic, difficulty, goals) => {
    setLoading(true)
    try {
      const response = await aiAPI.generatePath({
        topic,
        difficulty_level: difficulty,
        goals
      })
      setPaths([...paths, response.data])
      return response.data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { paths, loading, error, fetchPaths, createPath, generateWithAI }
}
