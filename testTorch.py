from flask import Flask, request, jsonify   #The main class to create your web application
from transformers import CLIPModel, CLIPProcessor
import torch
from PIL import Image
import requests                             #Object that contains data sent by the client
from io import BytesIO

app = Flask(__name__)

# Load CLIP once when server starts
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", use_safetensors=True)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)
model.eval()

@app.route('/filter-image', methods=['POST'])
def filter_image():
    try:
        # Get data from extension
        data = request.json
        print(f"Received request: {data}")
        
        image_url = data.get('image_url')
        user_filters = data.get('user_filters', [])
        
        # FIX: Ensure user_filters is a list
        if isinstance(user_filters, str):
            # If it's a string, convert to list
            user_filters = [user_filters]
        
        # Validate inputs
        if not image_url:
            return jsonify({'error': 'No image_url provided'}), 400
        
        if not user_filters:
            return jsonify({'error': 'No user_filters provided'}), 400
        
        print(f"Checking image: {image_url}")
        print(f"User filters: {user_filters}")
        
        # Download image from Twitter
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        
        # Prepare labels (user filters + safe option)
        labels = user_filters + ["safe appropriate content"]
        print(f"Labels: {labels}")
        
        # Run CLIP
        inputs = processor(text=labels, images=image, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=1)[0]
        
        # Check if any filter matches
        threshold = 0.6  # 60% confidence
        
        # FIX: Now enumerate will work because user_filters is definitely a list
        for i, filter_name in enumerate(user_filters):
            confidence = probs[i].item()
            print(f"  {filter_name}: {confidence:.2%}")
            
            if confidence > threshold:
                # Found a match - block it!
                result = {
                    'should_block': True,
                    'reason': f'Contains {filter_name}',
                    'confidence': confidence
                }
                print(f"🚫 BLOCKING: {result}")
                return jsonify(result)
        
        # No filters matched - show it
        result = {
            'should_block': False,
            'reason': 'Image is safe'
        }
        print(f"✅ ALLOWING: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'should_block': False  # Allow on error (safe default)
        }), 500

# Add a test endpoint to check if server is running
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'running',
        'device': device,
        'model': 'CLIP vit-base-patch32'
    })

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(port=5000, debug=True)