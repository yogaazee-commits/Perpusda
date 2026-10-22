const DATABASE_NAME = 'perpusda-files'
const DATABASE_VERSION = 1
const STORE_NAME = 'pdfs'

interface StoredPdf {
  key: string
  file: Blob
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Penyimpanan berkas tidak dapat dibuka.'))
  })
}

async function runRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = operation(transaction.objectStore(STORE_NAME))
    let result: T
    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => reject(request.error || new Error('Operasi penyimpanan berkas gagal.'))
    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error || new Error('Transaksi penyimpanan berkas gagal.'))
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan berkas dibatalkan.'))
  }).finally(() => database.close())
}

export function savePdf(key: string, file: Blob) {
  return runRequest('readwrite', store => store.put({ key, file } satisfies StoredPdf))
}

export async function getPdf(key: string) {
  const record = await runRequest<StoredPdf | undefined>('readonly', store => store.get(key))
  return record?.file
}

export function deletePdf(key: string) {
  return runRequest('readwrite', store => store.delete(key))
}

export function createPdfStorageKey() {
  return `pdf-${crypto.randomUUID()}`
}
