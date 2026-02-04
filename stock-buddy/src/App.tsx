import { useState, useEffect } from 'react'
import './App.css'

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  target?: number
  status: 'buy' | 'watch' | 'hold' | 'alert'
}

// Andy's watchlist
const WATCHLIST = [
  { symbol: 'NVDA', target: 169 },
  { symbol: 'AMD', target: 246 },
  { symbol: 'IONQ', target: 36 },
  { symbol: 'EOSE', target: 13 },
  { symbol: 'KEYS', target: 216 },
  { symbol: 'AVGO', target: null },
  { symbol: 'MSFT', target: null },
  { symbol: 'GOOG', target: null },
  { symbol: 'TSLA', target: null },
  { symbol: 'QLD', target: null },
]

function App() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStockData = async () => {
    setLoading(true)
    try {
      const symbols = WATCHLIST.map(w => w.symbol).join(',')
      // Using a free API endpoint
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
      )
      const data = await response.json()
      
      const results: StockData[] = data.quoteResponse.result.map((quote: any) => {
        const watchItem = WATCHLIST.find(w => w.symbol === quote.symbol)
        const price = quote.regularMarketPrice
        const target = watchItem?.target
        
        let status: 'buy' | 'watch' | 'hold' | 'alert' = 'hold'
        if (target) {
          if (price <= target) status = 'buy'
          else if (price <= target * 1.05) status = 'watch'
        }
        if (quote.regularMarketChangePercent < -5) status = 'alert'
        
        return {
          symbol: quote.symbol,
          price,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          target,
          status
        }
      })
      
      setStocks(results.sort((a, b) => {
        // Sort by status priority: buy > alert > watch > hold
        const priority = { buy: 0, alert: 1, watch: 2, hold: 3 }
        return priority[a.status] - priority[b.status]
      }))
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching stock data:', error)
      // Fallback to mock data for demo
      setStocks(WATCHLIST.map(w => ({
        symbol: w.symbol,
        price: Math.random() * 300 + 50,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 10,
        target: w.target ?? undefined,
        status: 'hold' as const
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStockData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStockData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'buy': return 'bg-green-500'
      case 'alert': return 'bg-red-500'
      case 'watch': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'buy': return '🟢 買點'
      case 'alert': return '🔴 警示'
      case 'watch': return '🟡 接近'
      default: return '⚪ 觀察'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-center">📊 Stock Buddy</h1>
        <p className="text-center text-slate-400 text-sm">
          {lastUpdate ? `更新於 ${lastUpdate.toLocaleTimeString()}` : '載入中...'}
        </p>
      </header>

      {loading && stocks.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {stocks.map(stock => (
            <div 
              key={stock.symbol}
              className={`p-4 rounded-xl bg-slate-800 border-l-4 ${getStatusColor(stock.status)}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{stock.symbol}</div>
                  <div className="text-xs text-slate-400">
                    {getStatusText(stock.status)}
                    {stock.target && ` • 目標 $${stock.target}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xl">
                    ${stock.price.toFixed(2)}
                  </div>
                  <div className={`text-sm font-mono ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
              {stock.target && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>目標價 ${stock.target}</span>
                    <span>
                      {stock.price <= stock.target 
                        ? '✅ 已到價' 
                        : `差 ${((stock.price - stock.target) / stock.target * 100).toFixed(1)}%`
                      }
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stock.price <= stock.target ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (stock.target / stock.price) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={fetchStockData}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
      >
        🔄
      </button>

      <footer className="mt-8 text-center text-slate-500 text-xs">
        霈霈豬實驗室 🐷
      </footer>
    </div>
  )
}

export default App
