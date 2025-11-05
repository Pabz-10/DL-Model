# source venv/bin/activate to run env

from flask import (
    Flask,
    render_template 
)

# create the instance of the appsss
app = Flask(__name__)

@app.route('/')

def home():
    return {"message": "Backend running"}

@app.route('/test')
def test():
    return {"status": "success", "data": [1, 2, 3]}

if __name__ == '__main__':
    app.run(debug=True, host= '127.0.0.1', port=8888)
