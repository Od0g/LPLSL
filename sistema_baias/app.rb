puts "--- ESTOU RODANDO A VERSAO NOVA DO ARQUIVO! ---" # <-- ADICIONE ISSO
require 'sinatra'
require 'sinatra/json' # Para a helper json()
require 'securerandom'
#require 'sinatra/reloader' if development? # Recarrega o server em dev
require 'json'

# --- Configuração ---
set :public_folder, 'public' # Onde estão nossos HTML/JS/CSS
set :port, 4567
set :bind, '0.0.0.0' # <--- ADICIONE ESTA LINHA
disable :protection
enable :sessions # Habilita sessões para o login
set :session_secret, 'a_very_long_and_very_secure_secret_key_that_is_at_least_64_bytes_long'

DATA_FILE = 'data.json'
ADMIN_PASSWORD = 'admin123' # Senha simples, como solicitado

# --- Helper de Autenticação ---
# Bloco que roda antes de rotas protegidas
before '/api/update' do
  unless session[:admin]
    halt 401, json(error: 'Não autorizado')
  end
end

# --- Rotas ---

# 1. Servir o App (Frontend)
get '/' do
  send_file File.join(settings.public_folder, 'index.html')
end

# 2. API: Obter todos os dados
get '/api/data' do
  content_type :json
  File.read(DATA_FILE)
end

# 3. API: Verificar status do login
get '/api/status' do
  json(isAdmin: !!session[:admin]) # Retorna true/false
end

# 4. API: Login
post '/api/login' do
  params = JSON.parse(request.body.read)
  if params['password'] == ADMIN_PASSWORD
    session[:admin] = true
    json(success: true)
  else
    session[:admin] = false
    status 401 # Não autorizado
    json(success: false, error: 'Senha incorreta')
  end
end

# 5. API: Logout
get '/api/logout' do
  session.clear
  json(success: true)
end

# 6. API: Salvar/Atualizar os dados (Protegido)
post '/api/update' do
  begin
    # Recebe o JSON completo do frontend
    new_data = JSON.parse(request.body.read)
    
    # Escreve no arquivo
    File.write(DATA_FILE, JSON.pretty_generate(new_data))
    
    json(success: true, message: 'Dados salvos com sucesso!')
  rescue => e
    status 500
    json(success: false, error: e.message)
  end
end