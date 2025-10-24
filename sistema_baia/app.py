import sqlite3
import json
from flask import Flask, render_template, request, jsonify, session, g

# --- Configuração ---
app = Flask(__name__)
app.config['DATABASE'] = 'database.db'
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-forte'  # Mude isso em produção
ADMIN_PASSWORD = 'admin123'  # Senha simples conforme solicitado

# --- Estrutura de Dados Inicial (JSON) ---
# NOTA: Ajustei sua estrutura de dados para corresponder perfeitamente
# à hierarquia de filtros solicitada (Setor > Modelo > Código > Type > Baia)
INITIAL_DATA = {
    "Região E": {
        "Honda HR-V": {
            "3GN": { # CÓDIGO DE TIPO
                "types": {
                    "3M6XMF7": {
                        "baias": {
                            "Baia 01": ["Item X", "Item 1", "Item D"],
                            "Baia 02": ["Item A", "Item B"]
                        }
                    }
                }
            }
        }
    },
    "Região C": {
        "Honda WR-V": {
            "3UT": { # CÓDIGO DE TIPO
                "types": {
                    "39KZMB5": {
                        "baias": {
                            "Baia 01": ["Item POP", "Item CKD"]
                        }
                    }
                }
            }
        }
    }
}

# --- Funções do Banco de Dados ---

def get_db():
    """Conecta ao banco de dados."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Fecha a conexão com o banco ao final da requisição."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Cria a tabela e insere os dados iniciais."""
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        
        # Insere os dados iniciais do JSON
        db.execute('INSERT INTO producao (data_json) VALUES (?)', 
                   (json.dumps(INITIAL_DATA),))
        db.commit()
        print("Banco de dados inicializado com sucesso.")

# --- Decorador de Autenticação ---
from functools import wraps

def admin_required(f):
    """Verifica se o usuário é admin antes de executar a função."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'success': False, 'error': 'Acesso negado'}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Rotas da Aplicação ---

@app.route('/')
def index():
    """Serve a página principal (index.html)."""
    return render_template('index.html')

# --- API de Autenticação ---

@app.route('/api/login', methods=['POST'])
def login():
    """Valida a senha do admin e cria uma sessão."""
    password = request.json.get('password')
    if password == ADMIN_PASSWORD:
        session['is_admin'] = True
        return jsonify({'success': True})
    else:
        session['is_admin'] = False
        return jsonify({'success': False, 'error': 'Senha incorreta'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Encerra a sessão do admin."""
    session.pop('is_admin', None)
    return jsonify({'success': True})

@app.route('/api/status', methods=['GET'])
def status():
    """Verifica o status de login."""
    return jsonify({'is_admin': session.get('is_admin', False)})

# --- API de Dados (CRUD) ---

@app.route('/api/data', methods=['GET'])
def get_data():
    """Busca todos os dados de produção do banco."""
    db = get_db()
    cur = db.execute('SELECT data_json FROM producao ORDER BY id DESC LIMIT 1')
    row = cur.fetchone()
    if row:
        return jsonify(json.loads(row['data_json']))
    else:
        return jsonify(INITIAL_DATA) # Fallback para dados iniciais

@app.route('/api/data', methods=['POST'])
@admin_required
def update_data():
    """Recebe e salva a estrutura de dados COMPLETA."""
    try:
        new_data = request.json
        if not isinstance(new_data, dict): # Validação simples
             return jsonify({'success': False, 'error': 'Formato inválido'}), 400
        
        db = get_db()
        db.execute('INSERT INTO producao (data_json) VALUES (?)', 
                   (json.dumps(new_data),))
        db.commit()
        return jsonify({'success': True, 'message': 'Dados salvos.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Comando para inicializar o DB ---
@app.cli.command('initdb')
def initdb_command():
    """Comando para criar o banco: 'flask initdb' """
    # Primeiro, crie o arquivo schema.sql
    with open('schema.sql', 'w') as f:
        f.write("""
        DROP TABLE IF EXISTS producao;
        CREATE TABLE producao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_json TEXT NOT NULL
        );
        """)
    init_db()
    import os
    os.remove('schema.sql') # Limpa o arquivo temporário

if __name__ == '__main__':
    app.run(debug=True, port=5001)