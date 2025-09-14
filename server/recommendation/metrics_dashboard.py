#!/usr/bin/env python
"""
Metrics Dashboard for TajiCart-AI Recommendation System

This module provides a simple Flask-based dashboard to visualize metrics from
the recommendation system.
"""

import glob
import json
import os
from datetime import datetime

import joblib
import pandas as pd
from flask import Flask, jsonify, render_template, request

# Configure paths
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')

# Initialize Flask app
app = Flask(__name__)

# Create template directory if not exists
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
if not os.path.exists(templates_dir):
    os.makedirs(templates_dir)

# Create default template
default_template = """
<!DOCTYPE html>
<html>
<head>
    <title>TajiCart-AI Recommendation Metrics</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        h1, h2 {
            color: #333;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-width: 300px;
            flex: 1;
        }
        .metric {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin: 10px 0;
        }
        .chart-container {
            height: 300px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th, td {
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
    </style>
</head>
<body>
    <h1>TajiCart-AI Recommendation Metrics Dashboard</h1>
    <p>Last updated: <span id="last-updated"></span></p>
    
    <div class="container">
        <div class="card">
            <h2>System Status</h2>
            <p>Latest Model: <span id="latest-model">Loading...</span></p>
            <p>Model Age: <span id="model-age">Loading...</span></p>
            <p>Users: <span id="num-users" class="metric">-</span></p>
            <p>Items: <span id="num-items" class="metric">-</span></p>
            <p>Interactions: <span id="num-interactions" class="metric">-</span></p>
        </div>
        
        <div class="card">
            <h2>Model Performance</h2>
            <p>Precision@10: <span id="precision" class="metric">-</span></p>
            <p>Recall@10: <span id="recall" class="metric">-</span></p>
            <p>AUC Score: <span id="auc" class="metric">-</span></p>
        </div>
    </div>
    
    <div class="container">
        <div class="card">
            <h2>Performance History</h2>
            <div class="chart-container">
                <canvas id="metrics-chart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h2>Recent Training Runs</h2>
            <div id="recent-models">
                <table id="model-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Model</th>
                            <th>Users</th>
                            <th>Items</th>
                            <th>Precision</th>
                        </tr>
                    </thead>
                    <tbody id="model-list">
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
        // Fetch dashboard data
        async function fetchDashboardData() {
            const response = await fetch('/api/dashboard');
            const data = await response.json();
            
            // Update system status
            document.getElementById('last-updated').textContent = new Date().toLocaleString();
            document.getElementById('latest-model').textContent = data.latest_model;
            document.getElementById('model-age').textContent = data.model_age;
            document.getElementById('num-users').textContent = data.num_users;
            document.getElementById('num-items').textContent = data.num_items;
            document.getElementById('num-interactions').textContent = data.num_interactions;
            
            // Update metrics
            document.getElementById('precision').textContent = data.metrics.precision ? 
                data.metrics.precision.toFixed(3) : '-';
            document.getElementById('recall').textContent = data.metrics.recall ? 
                data.metrics.recall.toFixed(3) : '-';
            document.getElementById('auc').textContent = data.metrics.auc ? 
                data.metrics.auc.toFixed(3) : '-';
            
            // Update model table
            const modelList = document.getElementById('model-list');
            modelList.innerHTML = '';
            
            data.recent_models.forEach(model => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(model.created_at).toLocaleString()}</td>
                    <td>${model.name}</td>
                    <td>${model.num_users}</td>
                    <td>${model.num_items}</td>
                    <td>${model.precision ? model.precision.toFixed(3) : '-'}</td>
                `;
                modelList.appendChild(row);
            });
            
            // Create performance chart
            const ctx = document.getElementById('metrics-chart').getContext('2d');
            
            // Extract data for chart
            const dates = data.performance_history.map(item => new Date(item.date).toLocaleDateString());
            const precision = data.performance_history.map(item => item.precision);
            const recall = data.performance_history.map(item => item.recall);
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: 'Precision@10',
                            data: precision,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.1
                        },
                        {
                            label: 'Recall@10',
                            data: recall,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1.0
                        }
                    }
                }
            });
        }
        
        // Initial fetch
        fetchDashboardData();
        
        // Refresh every 5 minutes
        setInterval(fetchDashboardData, 5 * 60 * 1000);
    </script>
</body>
</html>
"""

# Create template file
with open(os.path.join(templates_dir, 'dashboard.html'), 'w') as f:
    f.write(default_template)

@app.route('/')
def dashboard():
    """Render the main dashboard page"""
    return render_template('dashboard.html')

@app.route('/api/dashboard')
def dashboard_data():
    """API endpoint to get dashboard data"""
    try:
        # Get latest model info
        latest_model_info = get_latest_model_info()
        
        # Get recent training metrics from logs
        performance_history = get_performance_history()
        
        # Get info about recent models
        recent_models = get_recent_models()
        
        return jsonify({
            'latest_model': latest_model_info['name'],
            'model_age': latest_model_info['age'],
            'num_users': latest_model_info['num_users'],
            'num_items': latest_model_info['num_items'],
            'num_interactions': latest_model_info['num_interactions'],
            'metrics': {
                'precision': latest_model_info['metrics'].get('test_precision_at_k'),
                'recall': latest_model_info['metrics'].get('test_recall_at_k'),
                'auc': latest_model_info['metrics'].get('test_auc')
            },
            'performance_history': performance_history,
            'recent_models': recent_models
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'latest_model': 'Unknown',
            'model_age': 'Unknown',
            'num_users': 0,
            'num_items': 0,
            'num_interactions': 0,
            'metrics': {},
            'performance_history': [],
            'recent_models': []
        })

def get_latest_model_info():
    """Get information about the latest trained model"""
    try:
        # Check for latest model symlink
        latest_link = os.path.join(MODELS_DIR, 'latest')
        if os.path.exists(latest_link) and os.path.islink(latest_link):
            model_dir = os.path.realpath(latest_link)
        else:
            # Find most recent model directory
            model_dirs = [d for d in os.listdir(MODELS_DIR) 
                         if os.path.isdir(os.path.join(MODELS_DIR, d)) and d != 'latest']
            if not model_dirs:
                raise Exception("No trained models found")
            
            # Sort by modification time (most recent first)
            model_dirs.sort(key=lambda d: os.path.getmtime(os.path.join(MODELS_DIR, d)), reverse=True)
            model_dir = os.path.join(MODELS_DIR, model_dirs[0])
        
        # Get model name
        model_name = os.path.basename(model_dir)
        
        # Load metadata
        metadata_path = os.path.join(model_dir, 'metadata.joblib')
        if os.path.exists(metadata_path):
            metadata = joblib.load(metadata_path)
            created_at = metadata.get('created_at', None)
            num_users = metadata.get('num_users', 0)
            num_items = metadata.get('num_items', 0)
        else:
            created_at = datetime.fromtimestamp(os.path.getmtime(model_dir)).isoformat()
            num_users = 0
            num_items = 0
        
        # Calculate model age
        if created_at:
            created_datetime = datetime.fromisoformat(created_at)
            age_days = (datetime.now() - created_datetime).days
            age_text = f"{age_days} days" if age_days > 0 else "Today"
        else:
            age_text = "Unknown"
        
        # Try to get metrics if available
        metrics_path = os.path.join(model_dir, 'metrics.joblib')
        metrics = {}
        if os.path.exists(metrics_path):
            metrics = joblib.load(metrics_path)
        
        # Get number of interactions if available
        interactions_info_path = os.path.join(model_dir, 'interactions_info.joblib')
        num_interactions = 0
        if os.path.exists(interactions_info_path):
            interactions_info = joblib.load(interactions_info_path)
            num_interactions = interactions_info.get('num_interactions', 0)
        
        return {
            'name': model_name,
            'path': model_dir,
            'created_at': created_at,
            'age': age_text,
            'num_users': num_users,
            'num_items': num_items,
            'num_interactions': num_interactions,
            'metrics': metrics
        }
    
    except Exception as e:
        print(f"Error getting latest model info: {e}")
        return {
            'name': 'Unknown',
            'path': '',
            'created_at': None,
            'age': 'Unknown',
            'num_users': 0,
            'num_items': 0,
            'num_interactions': 0,
            'metrics': {}
        }

def get_performance_history():
    """Get historical performance metrics from logs"""
    try:
        # Find model trainer log files
        log_files = glob.glob(os.path.join(LOGS_DIR, 'model_trainer_*.log'))
        
        # Extract metrics from logs
        performance_data = []
        
        for log_file in log_files:
            # Get date from filename
            filename = os.path.basename(log_file)
            date_str = filename.replace('model_trainer_', '').replace('.log', '')
            try:
                date = datetime.strptime(date_str, '%Y%m%d').isoformat()
            except:
                continue
            
            # Parse log file for metrics
            with open(log_file, 'r') as f:
                log_content = f.read()
            
            # Look for evaluation metrics
            precision = None
            recall = None
            auc = None
            
            # Simple parsing, could be more robust
            if 'Evaluation metrics:' in log_content:
                metrics_line = log_content.split('Evaluation metrics:')[1].split('\n')[0].strip()
                try:
                    metrics_dict = eval(metrics_line)
                    precision = metrics_dict.get('test_precision_at_k')
                    recall = metrics_dict.get('test_recall_at_k')
                    auc = metrics_dict.get('test_auc')
                except:
                    pass
            
            if precision is not None or recall is not None:
                performance_data.append({
                    'date': date,
                    'precision': precision,
                    'recall': recall,
                    'auc': auc
                })
        
        # Sort by date
        performance_data.sort(key=lambda x: x['date'])
        
        return performance_data
    
    except Exception as e:
        print(f"Error getting performance history: {e}")
        return []

def get_recent_models():
    """Get information about recently trained models"""
    try:
        model_dirs = [d for d in os.listdir(MODELS_DIR) 
                     if os.path.isdir(os.path.join(MODELS_DIR, d)) and d != 'latest']
        
        # Sort by modification time (most recent first)
        model_dirs.sort(key=lambda d: os.path.getmtime(os.path.join(MODELS_DIR, d)), reverse=True)
        
        # Get the 5 most recent models
        recent_models = []
        for model_dir_name in model_dirs[:5]:
            model_dir = os.path.join(MODELS_DIR, model_dir_name)
            
            # Get metadata
            metadata_path = os.path.join(model_dir, 'metadata.joblib')
            created_at = None
            num_users = 0
            num_items = 0
            
            if os.path.exists(metadata_path):
                metadata = joblib.load(metadata_path)
                created_at = metadata.get('created_at')
                num_users = metadata.get('num_users', 0)
                num_items = metadata.get('num_items', 0)
            
            if not created_at:
                created_at = datetime.fromtimestamp(os.path.getmtime(model_dir)).isoformat()
            
            # Get metrics
            metrics_path = os.path.join(model_dir, 'metrics.joblib')
            precision = None
            
            if os.path.exists(metrics_path):
                metrics = joblib.load(metrics_path)
                precision = metrics.get('test_precision_at_k')
            
            recent_models.append({
                'name': model_dir_name,
                'created_at': created_at,
                'num_users': num_users,
                'num_items': num_items,
                'precision': precision
            })
        
        return recent_models
    
    except Exception as e:
        print(f"Error getting recent models: {e}")
        return []

if __name__ == '__main__':
    # Create directories if they don't exist
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
    
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR)
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5001, debug=True)