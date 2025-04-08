import sys
import whisper
import json

audio_file = sys.argv[1]  # Get audio file path from command line

model = whisper.load_model("base")
result = model.transcribe(audio_file)

# Output transcription in JSON format
print(json.dumps({"text": result["text"]}))
