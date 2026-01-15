"""
Health check endpoints for the Search Service.

Provides JSON endpoints and HTML dashboard for monitoring.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from .monitoring import monitoring_service

router = APIRouter()


@router.get("/health")
async def health_simple() -> dict:
    """Simple health check for load balancers and orchestrators."""
    return {"status": "healthy"}


@router.get("/health/json")
async def health_json() -> dict:
    """Detailed health data in JSON format."""
    return monitoring_service.get_health_data()


@router.get("/health/dashboard", response_class=HTMLResponse)
async def health_dashboard() -> HTMLResponse:
    """HTML dashboard with real-time metrics."""
    data = monitoring_service.get_health_data()
    req = data['requests']
    proc = data['process']
    env = data['environment']

    # Determine status colors
    cpu_class = ' warning' if proc['cpu_percent'] > 50 else ''
    mem_class = ' warning' if proc['memory_mb'] > 500 else ''
    resp_class = ' warning' if req['average_response_time_ms'] > 1000 else ''
    psutil_status = 'Active' if proc['psutil_available'] else 'Limited'
    psutil_class = ' success' if proc['psutil_available'] else ' warning'

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Search Service Health Dashboard</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: #e0e0e0;
                min-height: 100vh;
                padding: 20px;
            }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            h1 {{
                color: #00d4ff;
                font-size: 2.5em;
                margin-bottom: 10px;
                text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
            }}
            .status {{
                display: inline-block;
                padding: 8px 16px;
                background: linear-gradient(45deg, #00ff88, #00d4ff);
                color: #1a1a2e;
                border-radius: 20px;
                font-weight: bold;
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0%, 100% {{ opacity: 1; }}
                50% {{ opacity: 0.7; }}
            }}
            .metrics-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .metric-card {{
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }}
            .metric-card h3 {{
                color: #00d4ff;
                margin-bottom: 15px;
                font-size: 1.2em;
                border-bottom: 2px solid rgba(0, 212, 255, 0.3);
                padding-bottom: 8px;
            }}
            .metric-item {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }}
            .metric-item:last-child {{ border-bottom: none; }}
            .metric-label {{ color: #b0b0b0; }}
            .metric-value {{ font-weight: bold; color: #fff; }}
            .metric-value.success {{ color: #00ff88; }}
            .metric-value.warning {{ color: #ffaa00; }}
            .metric-value.error {{ color: #ff4444; }}
            .progress-bar {{
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-top: 5px;
            }}
            .progress-fill {{
                height: 100%;
                background: linear-gradient(90deg, #00d4ff, #00ff88);
                border-radius: 4px;
            }}
            .footer {{
                text-align: center;
                color: #666;
                font-size: 0.9em;
                margin-top: 20px;
            }}
            @media (max-width: 768px) {{
                .metrics-grid {{ grid-template-columns: 1fr; }}
                h1 {{ font-size: 1.8em; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Search Service Monitor</h1>
                <div class="status">{data['status'].upper()}</div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Process Resources</h3>
                    <div class="metric-item">
                        <span class="metric-label">Process CPU</span>
                        <span class="metric-value{cpu_class}">{proc['cpu_percent']}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Process Memory</span>
                        <span class="metric-value{mem_class}">{proc['memory_mb']:.1f} MB</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Monitoring</span>
                        <span class="metric-value{psutil_class}">{psutil_status}</span>
                    </div>
                </div>

                <div class="metric-card">
                    <h3>Request Statistics</h3>
                    <div class="metric-item">
                        <span class="metric-label">Total Requests</span>
                        <span class="metric-value">{req['total']:,}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Successful</span>
                        <span class="metric-value success">{req['successful']:,}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Failed</span>
                        <span class="metric-value error">{req['failed']:,}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value success">{req['success_rate']}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Avg Response</span>
                        <span class="metric-value{resp_class}">{req['average_response_time_ms']:.1f} ms</span>
                    </div>
                </div>

                <div class="metric-card">
                    <h3>Server Info</h3>
                    <div class="metric-item">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value">{data['uptime_formatted']}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Python</span>
                        <span class="metric-value">{env['python_version']}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Platform</span>
                        <span class="metric-value">{env['platform']}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Architecture</span>
                        <span class="metric-value">{env['architecture']}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div>Last updated: {data['timestamp']}</div>
                <div>Auto-refresh every 3 seconds</div>
            </div>
        </div>

        <script>
            setInterval(() => location.reload(), 3000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
