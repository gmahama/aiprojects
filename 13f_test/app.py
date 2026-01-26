from flask import Flask, render_template, request, jsonify
import requests
import time
import json
import hmac
import hashlib
import base64
import urllib.parse
import os

app = Flask(__name__)

# Add rate limiting
import time
last_api_call = 0
MIN_API_DELAY = 2  # Minimum 2 seconds between API calls

# Debug: Print current working directory and template folder
print(f"Current working directory: {os.getcwd()}")
print(f"Template folder: {app.template_folder}")
print(f"Templates exist: {os.path.exists('templates')}")
print(f"Index.html exists: {os.path.exists('templates/index.html')}")

SHARED_KEY = "25VJE0nRicB38keHYumR"
SECRET_KEY = "8cYNm4H02IHDDizobkIskBllpeDQ7jchkalhE2Rm"
API_BASE = "https://whalewisdom.com/shell/command.json"

def rate_limit_api():
    """Ensure minimum delay between API calls"""
    global last_api_call
    current_time = time.time()
    time_since_last = current_time - last_api_call
    
    if time_since_last < MIN_API_DELAY:
        sleep_time = MIN_API_DELAY - time_since_last
        print(f"Rate limiting: waiting {sleep_time:.2f} seconds before next API call")
        time.sleep(sleep_time)
    
    last_api_call = time.time()

def sign_args(args_obj, secret_key, timestamp=None):
    # Go back to ISO timestamp format that was working earlier
    if not timestamp:
        timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    
    # Convert args to JSON string with proper formatting
    args_str = json.dumps(args_obj, separators=(",", ":"), sort_keys=True)
    
    # Create message for signature
    message = args_str + "\n" + timestamp
    
    print(f"Signing message: {message}")
    print(f"Timestamp format: {timestamp}")
    
    # Generate HMAC-SHA1 signature
    digest = hmac.new(secret_key.encode('utf-8'), message.encode('utf-8'), hashlib.sha1).digest()
    
    # Use the character replacement that was working earlier
    sig = base64.b64encode(digest).decode().replace("+", "-").replace("/", "_")
    
    print(f"Generated signature: {sig}")
    print(f"Timestamp used: {timestamp}")
    
    return args_str, sig, timestamp

def get_filer_id(name):
    rate_limit_api()  # Add rate limiting
    
    args = {"command": "filer_lookup", "name": name}
    args_str, sig, timestamp = sign_args(args, SECRET_KEY)
    params = {
        "args": args_str,
        "api_shared_key": SHARED_KEY,
        "api_sig": sig,
        "timestamp": timestamp
    }
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    
    print(f"Calling WhaleWisdom API: {url}")
    print(f"Parameters: {params}")
    
    resp = requests.get(url)
    print(f"Response status: {resp.status_code}")
    print(f"Response headers: {dict(resp.headers)}")
    print(f"Response content: {resp.text[:500]}...")  # First 500 chars
    
    if resp.status_code != 200:
        print(f"API returned error status: {resp.status_code}")
        return None
    
    if not resp.text.strip():
        print("API returned empty response")
        return None
    
    try:
        data = resp.json()
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        print(f"Raw response: {resp.text}")
        return None
    
    if not data or not data.get("filers"):
        print(f"No filers found in response: {data}")
        return None
    
    print(f"Found {len(data['filers'])} filers")
    return data["filers"]

def get_holdings(filer_id):
    rate_limit_api()  # Add rate limiting
    
    # Go back to the simple approach that was working
    args = {"command": "holdings", "filer_ids": [filer_id]}
    args_str, sig, timestamp = sign_args(args, SECRET_KEY)
    params = {
        "args": args_str,
        "api_shared_key": SHARED_KEY,
        "api_sig": sig,
        "timestamp": timestamp
    }
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    
    print(f"Calling holdings API for filer {filer_id}")
    print(f"Holdings API URL: {url}")
    
    resp = requests.get(url)
    print(f"Holdings response status: {resp.status_code}")
    print(f"Holdings response content: {resp.text[:1000]}...")  # First 1000 chars
    
    if resp.status_code != 200:
        print(f"Holdings API failed with status: {resp.status_code}")
        print(f"Response: {resp.text}")
        return None
    
    # Success! Parse the response
    try:
        data = resp.json()
    except json.JSONDecodeError as e:
        print(f"Failed to parse holdings JSON: {e}")
        return None
    
    print(f"Holdings data structure: {json.dumps(data, indent=2)[:1000]}...")
    
    if not data or not data.get("results"):
        print("No results in holdings response")
        return None
    
    if not data["results"][0].get("records"):
        print("No records in first result")
        return None
    
    if not data["results"][0]["records"][0].get("holdings"):
        print("No holdings in first record")
        print(f"Available keys in record: {list(data['results'][0]['records'][0].keys())}")
        return None
    
    holdings = data["results"][0]["records"][0]["holdings"]
    print(f"Found {len(holdings)} holdings")
    if holdings:
        print(f"First holding structure: {json.dumps(holdings[0], indent=2)}")
    
    return holdings

@app.route('/')
def index():
    print("Index route called")
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Error rendering template: {e}")
        return f"Error: {str(e)}", 500

@app.route('/test')
def test():
    return "Flask is working! Test route successful."

@app.route('/test_api')
def test_api():
    """Test if we can get any response from WhaleWisdom API"""
    try:
        # Try a simple API call to see what happens
        args = {"command": "filer_lookup", "name": "berkshire"}
        args_str, sig, timestamp = sign_args(args, SECRET_KEY)
        params = {
            "args": args_str,
            "api_shared_key": SHARED_KEY,
            "api_sig": sig,
            "timestamp": timestamp
        }
        url = API_BASE + "?" + urllib.parse.urlencode(params)
        
        print(f"Testing API with URL: {url}")
        resp = requests.get(url)
        
        return jsonify({
            "status_code": resp.status_code,
            "response_text": resp.text[:500],
            "url": url,
            "signature": sig,
            "timestamp": timestamp
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_funds():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400
            
        fund_name = data.get('fund_name', '').strip()
        
        if not fund_name:
            return jsonify({'error': 'Fund name is required'}), 400
        
        print(f"Searching for fund: {fund_name}")
        filers = get_filer_id(fund_name)
        
        if filers is None:
            return jsonify({'error': 'Failed to fetch data from WhaleWisdom API. Please try again later.'}), 500
        
        if not filers:
            return jsonify({'error': f'No funds found matching "{fund_name}". Try a different search term.'}), 404
        
        return jsonify({'filers': filers})
        
    except Exception as e:
        print(f"Error in search_funds: {e}")
        return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

@app.route('/api/holdings/<int:filer_id>', methods=['GET'])
def get_fund_holdings(filer_id):
    holdings = get_holdings(filer_id)
    if holdings is None:
        return jsonify({'error': 'No holdings found'}), 404
    
    return jsonify({'holdings': holdings})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
