import requests
import time
import json
import hmac
import hashlib
import base64
import urllib.parse

SHARED_KEY = "RxrZtcsYf6EzIVv12P1R"
SECRET_KEY = "Nbj92Gb7yW3UMpSdmMaLqRtRSdLbdVXSv3NaXZts"

API_BASE = "https://whalewisdom.com/shell/command.json"

def sign_args(args_obj, secret_key, timestamp=None):
    args_str = json.dumps(args_obj, separators=(",", ":"), sort_keys=True)
    if not timestamp:
        timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    message = args_str + "\n" + timestamp
    digest = hmac.new(secret_key.encode(), message.encode(), hashlib.sha1).digest()
    sig = base64.b64encode(digest).decode().replace('\n', '')
    return args_str, sig, timestamp

def get_filer_id(cik_or_name):
    args = {"command": "filer_lookup", "name": cik_or_name}
    args_str, sig, timestamp = sign_args(args, SECRET_KEY)
    params = {
        "args": args_str,
        "api_shared_key": SHARED_KEY,
        "api_sig": sig,
        "timestamp": timestamp
    }
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    resp = requests.get(url)
    print(f"API Response Status: {resp.status_code}")
    print(f"API Response Content: {resp.text}")
    data = resp.json()
    if not data or not data.get("filers"):
        print("No filer found for CIK/name.")
        return None
    return data["filers"][0]["id"]

def get_holdings(filer_id):
    args = {"command": "holdings", "filer_ids": [filer_id]}
    args_str, sig, timestamp = sign_args(args, SECRET_KEY)
    params = {
        "args": args_str,
        "api_shared_key": SHARED_KEY,
        "api_sig": sig,
        "timestamp": timestamp
    }
    url = API_BASE + "?" + urllib.parse.urlencode(params)
    resp = requests.get(url)
    data = resp.json()
    positions = data.get("results", [])
    if not positions:
        print("No holdings found.")
        return
    print(f"Current 13F Holdings for filer ID {filer_id}:\n")
    for pos in positions:
        print(f"{pos.get('stock_name', 'N/A')} (Ticker: {pos.get('stock_ticker', 'N/A')}), Shares: {pos.get('current_shares', 'N/A')}, Value: ${pos.get('current_mv', 'N/A')}")

def main():
    name = "berkshire"
    filer_id = get_filer_id(name)
    if not filer_id:
        return
    print(f"Found filer ID: {filer_id}")
    get_holdings(filer_id)

if __name__ == "__main__":
    main() 