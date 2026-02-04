import { useState, useEffect } from 'react'
import './App.css'

interface WatchlistStock {
  symbol: string
  name: string
  business: string
  buyReason: string
  targetEntry: number | null
  entryNote: string
  holdPeriod: string
  exitStrategy: string
  stopLoss: number | string | null
  invalidIf: string | null
  catalyst: string | null
  source: string
  priority: number
}

interface StockData extends WatchlistStock {
  price: number
  change: number
  changePercent: number
  status: 'buy' | 'near' | 'watch' | 'alert'
  distancePercent: number | null
}

function App() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([])

  // Load watchlist data
  useEffect(() => {
    fetch('/watchlist.json')
      .then(res => res.json())
      .then(data => {
        setWatchlist(data.stocks)
      })
      .catch(err => console.error('Failed to load watchlist:', err))
  }, [])

  const fetchStockData = async () => {
    if (watchlist.length === 0) return
    
    setLoading(true)
    try {
      const symbols = watchlist.map(w => w.symbol).join(',')
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
      )
      const data = await response.json()
      
      const results: StockData[] = data.quoteResponse.result.map((quote: any) => {
        const watchItem = watchlist.find(w => w.symbol === quote.symbol)
        if (!watchItem) return null
        
        const price = quote.regularMarketPrice
        const target = watchItem.targetEntry
        
        let status: 'buy' | 'near' | 'watch' | 'alert' = 'watch'
        let distancePercent: number | null = null
        
        if (target) {
          distancePercent = ((price - target) / target) * 100
          if (price <= target) status = 'buy'
          else if (distancePercent <= 5) status = 'near'
        }
        if (quote.regularMarketChangePercent < -5) status = 'alert'
        
        return {
          ...watchItem,
          price,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          status,
          distancePercent
        }
      }).filter(Boolean)
      
      // Sort: buy > alert > near > watch
      setStocks(results.sort((a, b) => {
        const priority = { buy: 0, alert: 1, near: 2, watch: 3 }
        return priority[a.status] - priority[b.status]
      }))
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchStockData()
      const interval = setInterval(fetchStockData, 30000)
      return () => clearInterval(interval)
    }
  }, [watchlist])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'buy': return 'border-green-500 bg-green-500/10'
      case 'alert': return 'border-red-500 bg-red-500/10'
      case 'near': return 'border-yellow-500 bg-yellow-500/10'
      default: return 'border-slate-600 bg-slate-800'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'buy': return <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">🎯 買點</span>
      case 'alert': return <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">🔴 警示</span>
      case 'near': return <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">🟡 接近</span>
      default: return <span className="px-2 py-0.5 rounded-full bg-slate-600 text-white text-xs">觀察</span>
    }
  }

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol(expandedSymbol === symbol ? null : symbol)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-center">📊 Mimi Watchlist</h1>
        <p className="text-center text-slate-400 text-sm mt-1">
          MimiVsJames 推薦追蹤
        </p>
        <p className="text-center text-slate-500 text-xs mt-1">
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
              className={`rounded-xl border-l-4 ${getStatusColor(stock.status)} overflow-hidden`}
            >
              {/* Header - always visible */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(stock.symbol)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{stock.symbol}</span>
                      {getStatusBadge(stock.status)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{stock.name}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{stock.business}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xl">
                      ${stock.price.toFixed(2)}
                    </div>
                    <div className={`text-sm font-mono ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {/* Target progress */}
                {stock.targetEntry && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>目標 ${stock.targetEntry}</span>
                      <span>
                        {stock.price <= stock.targetEntry 
                          ? '✅ 已到價！' 
                          : `差 ${stock.distancePercent?.toFixed(1)}%`
                        }
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${stock.price <= stock.targetEntry ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (stock.targetEntry / stock.price) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="text-center text-slate-500 text-xs mt-2">
                  {expandedSymbol === stock.symbol ? '▲ 收起' : '▼ 展開詳情'}
                </div>
              </div>
              
              {/* Expanded details */}
              {expandedSymbol === stock.symbol && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3 bg-slate-800/50">
                  <div>
                    <div className="text-xs text-blue-400 font-semibold mb-1">💡 推薦原因</div>
                    <div className="text-sm text-slate-300">{stock.buyReason}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-green-400 font-semibold mb-1">🎯 進場建議</div>
                      <div className="text-sm text-slate-300">{stock.entryNote}</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-400 font-semibold mb-1">⏱️ 持有週期</div>
                      <div className="text-sm text-slate-300">{stock.holdPeriod}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-orange-400 font-semibold mb-1">🚪 出場策略</div>
                    <div className="text-sm text-slate-300">{stock.exitStrategy}</div>
                  </div>
                  
                  {stock.stopLoss && (
                    <div>
                      <div className="text-xs text-red-400 font-semibold mb-1">🛑 停損</div>
                      <div className="text-sm text-slate-300">{stock.stopLoss}</div>
                    </div>
                  )}
                  
                  {stock.invalidIf && (
                    <div>
                      <div className="text-xs text-red-400 font-semibold mb-1">⚠️ 論點失效</div>
                      <div className="text-sm text-slate-300">{stock.invalidIf}</div>
                    </div>
                  )}
                  
                  {stock.catalyst && (
                    <div>
                      <div className="text-xs text-yellow-400 font-semibold mb-1">📅 催化劑</div>
                      <div className="text-sm text-slate-300">{stock.catalyst}</div>
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                    📖 來源：{stock.source}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={fetchStockData}
        disabled={loading}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white p-4 rounded-full shadow-lg transition-colors"
      >
        {loading ? '⏳' : '🔄'}
      </button>

      <footer className="mt-8 text-center text-slate-500 text-xs">
        霈霈豬實驗室 🐷 × MimiVsJames
      </footer>
    </div>
  )
}

export default App
