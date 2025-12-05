from flask import Flask, request, jsonify
from flask_cors import CORS
from scheduler import ShiftlyScheduler

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({'status': 'Shiftly Scheduler API', 'version': '1.0'})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/schedule', methods=['POST'])
def schedule():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        scheduler = ShiftlyScheduler(data)
        result = scheduler.solve(timeout_seconds=60)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)