from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import os
import torch
import argostranslate.package
import argostranslate.translate
import psycopg2 
from langdetect import detect
from html.parser import HTMLParser

app = Flask(__name__)

# CONFIGURAÇÃO DEFINITIVA DE CORS
CORS(app, resources={
    r"/*": {
        "origins": ["https://jovensstp.com", "http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-KEY", "Authorization"],
        "supports_credentials": True
    }
})

try:
    from waitress import serve
    HAS_WAITRESS = True
except ImportError:
    HAS_WAITRESS = False

# --- CONFIGURATION ---
API_KEY = os.getenv("VPS_API_KEY", "jovens-stp-secret-key-2024") # Recomenda-se mudar via ENV
model = whisper.load_model("base")

def require_api_key(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.headers.get('X-API-KEY') == API_KEY:
            return f(*args, **kwargs)
        return jsonify({"error": "Unauthorized"}), 401
    return decorated

DB_CONFIG = {
    "dbname": "jovens_stp",
    "user": "jovens_db_master",
    "password": "Margarida17",
    "host": "127.0.0.1",
    "port": "5432"
}

# --- TRANSLATION CONFIGURATION ---
SUPPORTED_LANGS = ['pt', 'en', 'es', 'fr', 'it', 'de', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr', 'bn', 'vi', 'nl', 'pl']

def initialize_translation():
    print("🚀 Initializing Universal Translation System...")
    try:
        import argostranslate.package
        argostranslate.package.update_package_index()
        available_packages = argostranslate.package.get_available_packages()
        
        # O ArgosTranslate funciona melhor com o Inglês (en) como ponte.
        # Vamos garantir que todas as línguas têm ligação ao Inglês e ao Português.
        for lang in SUPPORTED_LANGS:
            if lang == 'en': continue
            
            # Pares prioritários: Lang <-> EN e PT <-> EN
            target_pairs = [(lang, 'en'), ('en', lang), ('pt', 'en'), ('en', 'pt')]
            
            for from_code, to_code in target_pairs:
                installed = argostranslate.package.get_installed_packages()
                if not any(p.from_code == from_code and p.to_code == to_code for p in installed):
                    try:
                        pkg = next(filter(lambda x: x.from_code == from_code and x.to_code == to_code, available_packages))
                        print(f"📦 Downloading {from_code} -> {to_code}...")
                        argostranslate.package.install_from_path(pkg.download())
                    except StopIteration:
                        # Nem todos os pares diretos existem, alguns usam pivot automático
                        continue
                    except Exception as e:
                        print(f"⚠️ Error installing {from_code}-{to_code}: {e}")
                
        print("✅ Universal Translation System Ready!")
    except Exception as e:
        print(f"❌ Critical Error in Translation Init: {e}")

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS translation_cache (
                    id SERIAL PRIMARY KEY,
                    original_text TEXT,
                    target_lang VARCHAR(10),
                    translated_text TEXT,
                    UNIQUE(original_text, target_lang)
                )
            """)
            conn.commit
            cur.close()
        finally:
            conn.close()

init_db()

@app.route('/db/query', methods=['POST'])
@require_api_key
def db_query():
    data = request.json
    sql = data.get('sql')
    params = data.get('params', [])
    
    if not sql:
        return jsonify({"error": "No SQL provided"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "DB connection failed"}), 500
        
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        
        # Se for SELECT, retorna dados
        if sql.strip().upper().startswith("SELECT"):
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            return jsonify({"results": results})
        
        # Se for INSERT/UPDATE/DELETE, retorna rows afetadas
        conn.commit()
        affected = cur.rowcount
        cur.close()
        return jsonify({"affected_rows": affected})
        
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route('/transcribe', methods=['POST'])
@require_api_key
def transcribe():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    import uuid
    audio_file = request.files['file']
    unique_id = str(uuid.uuid4())
    audio_path = f"temp_audio_{unique_id}.webm"
    audio_file.save(audio_path)
    
    try:
        result = model.transcribe(audio_path)
        return jsonify({"text": result['text']})
    except Exception as e:
        print("Transcription Error:", str(e))
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

@app.route('/translate', methods=['POST'])
@require_api_key
def translate():
    data = request.json
    text = data.get('text')
    to_lang = data.get('to', 'en')
    from_lang = data.get('from', 'auto')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    is_html = ('<' in text and '>' in text)

    print(f"--- Translation Request: {from_lang} -> {to_lang} ---")
    print(f"Content: {text[:100]}...")

    if from_lang == 'auto':
        try:
            from_lang = detect(text)
            print(f"Detected: {from_lang}")
        except Exception as e:
            print(f"Detection failed, defaulting to 'pt': {e}")
            from_lang = 'pt'

    if from_lang == to_lang:
        return jsonify({"translatedText": text, "cached": True})

    # 1. Tentar Cache (Mas não bloquear se falhar)
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT translated_text FROM translation_cache WHERE original_text = %s AND target_lang = %s", (text, to_lang))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                print("✅ Found in Cache")
                return jsonify({"translatedText": row[0], "cached": True})
    except Exception as e:
        print(f"⚠️ Cache bypassed (DB Error): {e}")

    # 2. Tradução Real
    try:
        print(f"⚙️ Translating via Argos (HTML: {is_html})...")
        
        if is_html:
            class SafeHTMLTranslator(HTMLParser):
                def __init__(self, f_lang, t_lang):
                    super().__init__()
                    self.f_lang = f_lang
                    self.t_lang = t_lang
                    self.result = ""
                    
                def handle_starttag(self, tag, attrs):
                    attr_str = "".join([f' {k}="{v}"' for k, v in attrs] if attrs else [])
                    self.result += f"<{tag}{attr_str}>"
                    
                def handle_endtag(self, tag):
                    self.result += f"</{tag}>"
                    
                def handle_data(self, data):
                    if data.strip() and data.strip() != '&nbsp;':
                        try:
                            trans = argostranslate.translate.translate(data, self.f_lang, self.t_lang)
                            self.result += trans
                        except:
                            self.result += data
                    else:
                        self.result += data

                def handle_entityref(self, name):
                    self.result += f"&{name};"

                def handle_charref(self, name):
                    self.result += f"&#{name};"
            
            parser = SafeHTMLTranslator(from_lang, to_lang)
            parser.feed(text)
            translated_text = parser.result
        else:
            translated_text = argostranslate.translate.translate(text, from_lang, to_lang)
            
        print(f"✅ Success: {translated_text[:50]}...")
        
        # 3. Guardar em Cache (Background/Async opcional, aqui tentamos rápido)
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("INSERT INTO translation_cache (original_text, target_lang, translated_text) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (text, to_lang, translated_text))
                conn.commit()
                cur.close()
                conn.close()
        except:
            pass # Ignoramos erro ao guardar cache para não travar a resposta

        return jsonify({"translatedText": translated_text, "cached": False})
    except Exception as e:
        print(f"❌ Translation Logic Error: {e}")
        return jsonify({"error": f"ArgosTranslate error: {str(e)}"}), 500

if __name__ == '__main__':
    # Initialize translation packages on startup
    initialize_translation()
    
    if HAS_WAITRESS:
        print("Starting production server with Waitress on port 5001...")
        serve(app, host='0.0.0.0', port=5001)
    else:
        print("Waitress not found. Starting development server on port 5001...")
        app.run(host='0.0.0.0', port=5001)

