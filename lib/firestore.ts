import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "./firebase"
import type { GlobalStats, UserStats, ScanResult } from "./types"

// Collection references
const GLOBAL_STATS_DOC = "global/statistics"
const SCANS_COLLECTION = "scans"
const USER_STATS_COLLECTION = "userStats"

// Get global statistics
export async function getGlobalStats(): Promise<GlobalStats | null> {
  try {
    const docRef = doc(db, GLOBAL_STATS_DOC)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        totalScans: data.totalScans || 0,
        totalObjectsDetected: data.totalObjectsDetected || 0,
        plasticCategoryCounts: data.plasticCategoryCounts || {},
        lastUpdate: data.lastUpdate?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    }

    // Return default stats if document doesn't exist
    return {
      totalScans: 0,
      totalObjectsDetected: 0,
      plasticCategoryCounts: {},
      lastUpdate: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error fetching global stats:", error)
    return null
  }
}

// Update global statistics after a scan
export async function updateGlobalStats(scanResult: ScanResult): Promise<void> {
  try {
    const docRef = doc(db, GLOBAL_STATS_DOC)
    const docSnap = await getDoc(docRef)

    // Calculate plastic category counts from scan
    const categoryCounts: Record<string, number> = {}
    scanResult.objects.forEach((obj) => {
      const category = `PET-${obj.plasticCode}`
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    if (docSnap.exists()) {
      // Update existing stats
      const existingData = docSnap.data()
      const existingCounts = existingData.plasticCategoryCounts || {}

      // Merge category counts
      Object.keys(categoryCounts).forEach((key) => {
        existingCounts[key] = (existingCounts[key] || 0) + categoryCounts[key]
      })

      await updateDoc(docRef, {
        totalScans: increment(1),
        totalObjectsDetected: increment(scanResult.totalObjects),
        plasticCategoryCounts: existingCounts,
        lastUpdate: serverTimestamp(),
      })
    } else {
      // Create new stats document
      await setDoc(docRef, {
        totalScans: 1,
        totalObjectsDetected: scanResult.totalObjects,
        plasticCategoryCounts: categoryCounts,
        lastUpdate: serverTimestamp(),
      })
    }
  } catch (error) {
    console.error("Error updating global stats:", error)
  }
}

// Save scan result to history
export async function saveScanResult(scanResult: ScanResult, userId?: string): Promise<string | null> {
  try {
    const scanDoc = doc(collection(db, SCANS_COLLECTION))

    await setDoc(scanDoc, {
      ...scanResult,
      userId: userId || "anonymous",
      createdAt: serverTimestamp(),
    })

    return scanDoc.id
  } catch (error) {
    console.error("Error saving scan result:", error)
    return null
  }
}

// Get recent scans
export async function getRecentScans(limitCount = 10): Promise<ScanResult[]> {
  try {
    const scansRef = collection(db, SCANS_COLLECTION)
    const q = query(scansRef, orderBy("createdAt", "desc"), limit(limitCount))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        objects: data.objects || [],
        education: data.education || {},
        totalObjects: data.totalObjects || 0,
        scanDate: data.createdAt?.toDate?.()?.toISOString() || data.scanDate,
      } as ScanResult
    })
  } catch (error) {
    console.error("Error fetching recent scans:", error)
    return []
  }
}

// Get or create user stats
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const docRef = doc(db, USER_STATS_COLLECTION, userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        userId: data.userId,
        scanCount: data.scanCount || 0,
        lastScan: data.lastScan?.toDate?.()?.toISOString() || "",
        lastCategories: data.lastCategories || [],
      }
    }

    return {
      userId,
      scanCount: 0,
      lastScan: "",
      lastCategories: [],
    }
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return null
  }
}

// Update user stats after scan
export async function updateUserStats(userId: string, scanResult: ScanResult): Promise<void> {
  try {
    const docRef = doc(db, USER_STATS_COLLECTION, userId)
    const categories = scanResult.objects.map((obj) => obj.plasticType)

    await setDoc(
      docRef,
      {
        userId,
        scanCount: increment(1),
        lastScan: serverTimestamp(),
        lastCategories: categories.slice(0, 5), // Keep last 5 categories
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating user stats:", error)
  }
}

// Get plastic category distribution
export async function getPlasticDistribution(): Promise<Record<string, number>> {
  try {
    const stats = await getGlobalStats()
    return stats?.plasticCategoryCounts || {}
  } catch (error) {
    console.error("Error fetching plastic distribution:", error)
    return {}
  }
}
