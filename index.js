var http = require ('http');
var express = require ('express');
var app = express();
var fs = require('fs');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.get("/chat", function(req, res){
    console.log('HOMEPAGE - BRABO');
    res.sendFile(__dirname + '/views/cliente.html')
})

app.use('/static', express.static('node_modules'));

io.on('connection', function(socket){
    console.log('Socket Cliente/Server');
    
    var news = [];
    socket.emit('news', news);  
   
    socket.on('pontocheck', (data)=>{

        news.push({'nome': data.nome, 'mensagem': data.mensagem});  
        socket.emit('news', news);
        
        let nome = data.nome;
        let mensagem = data.mensagem; 

        fs.open('./papo.txt', 'a+', (err, data)=>{
            if(err) 
            return console.error(err);      
                 
            fs.write(data, `${nome} ${mensagem}`, 'utf-8', (err)=>{
                if(err)
                return console.error(err);
              
            });
        });        

    });
});

server.listen(3010);

