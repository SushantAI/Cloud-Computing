//DOM Element
var usernameInputEl = document.querySelector("#person");
var connectBtnEl = document.querySelector('#connect');
var disconnectBtnEl = document.querySelector('#disconnect');
var usernameListEl = document.querySelector("#userList");
var articleEl = document.querySelector('article');
var messageBoardEl = articleEl.querySelector('#message-board');
var messageInputEl = articleEl.querySelector('#message');
var sendBtnEl = articleEl.querySelector('#send');
var chatToLabelEl = articleEl.querySelector('#destination');

// All btn, to chat to all people in the room
var chatToAllEl = document.querySelector('#all');

// current chat destination
var rcvr = 'all';

//Chat room that holds every conversation
var chatRoom = 
{
    'all': []
};

//socket object.
var socket = undefined;

connectBtnEl.onclick = connect;
disconnectBtnEl.onclick = disconnect;

function connect() {
    //ws is a websocket protocol
    //location.host + location.pathname is the current url
    //new WebSocket(url) will immediately open a websocket connection
    socket = new WebSocket("ws://"+ location.host + location.pathname +"chat?person=" + usernameInputEl.value);

    //add the event listener for the socket object
    socket.onopen = socketOnOpen;
    socket.onmessage = socketOnMessage;
    socket.onclose = socketOnClose;
    window.onclose = socketOnClose;
}

function disconnect() {
    //close the connection and the reset the socket object
    socket.close();
    socket = undefined;
}

function socketOnOpen(e) {
    usernameInputEl.disabled = true;
    connectBtnEl.disabled = true;
    disconnectBtnEl.disabled = false;
}

function socketOnMessage(e) {
    var ent = e.data.substr(0, e.data.indexOf("~"));
    var msg = e.data.substr(e.data.indexOf("~") + 1);

    var func;
    if(ent == 'newUser') func = addPrsn;
    else if(ent == 'removeUser') func = deletePrsn;
    else if(ent == 'message') func = receiveChunk;

    func.apply(null, msg.split('~'));
}

function socketOnClose(e) {
    usernameInputEl.disabled = false;
    connectBtnEl.disabled = false;
    disconnectBtnEl.disabled = true;
    usernameInputEl.value = '';
    messageBoardEl.innerHTML = '';
    chatToLabelEl.innerHTML = 'All';
    usernameListEl.innerHTML = '';
}

function addPrsn() {
    //if there is no users, return from the function
    if(arguments.length == 1 && arguments[0] == "") return;
    var personLst = arguments;

    //Loop through all online users
    //foreach user, create a list with username as it's id and content
    //when the list is clicked, change the chat target to that user
    var cdf = document.createDocumentFragment();
    for(var i = 0; i < personLst.length; i++) {
        var person = personLst[i];
        var dc = document.createElement("li");
        dc.id = person;
        dc.textContent = person;
        if(person != usernameInputEl.value) {
            //we can chat to everyone in the chat room
            //except our self
            dc.onclick = talkToSpecificPerson(person);
            dc.classList.add('hoverable');
        }
        cdf.appendChild(dc);
    }
    usernameListEl.appendChild(cdf);
}

function receiveChunk(chunkFrm, chunk, rcvr) {
        //destination
		rcvr = rcvr || chunkFrm;

        //if the current chat is the same as the incoming message destination
        //then add it to the conversation
        //else notify the user that there is an incoming message
        if(rcvr == rcvr) {
            var addEmt = updatePerson(chunkFrm, chunk);
            messageBoardEl.appendChild(addEmt);
        } else {
            var hb = usernameListEl.querySelector('#' + rcvr);
            chunkCounter(hb);
        }

        //push the incoming message to the conversation
        if(chatRoom[rcvr]) chatRoom[rcvr].push(addEmt);
        else chatRoom[rcvr] = [addEmt];
}

function deletePrsn(deletePerson) {
    //remove the user from the username list
    usernameListEl.querySelector('#' + deletePerson).remove();
}

/**
 * Return a conversation element.
 * example:
 * <div>
 *      <span>Andi</span>        <!-- Sender -->
 *      <span>Hello World</span> <!-- Message -->
 * </div>
 *
 * */
function updatePerson(chunkFrm, chunk) {
    var crtEmt = document.createElement('div');
    var chunkFrmEmt = document.createElement('span');
    var chunkEmt = document.createElement('span');

    if(chunkFrm == usernameInputEl.value) chunkFrm = 'me';

    chunkFrmEmt.textContent = chunkFrm;
    chunkEmt.textContent = chunk;

    crtEmt.appendChild(chunkFrmEmt);
    crtEmt.appendChild(chunkEmt);
    return crtEmt;
}

function chunkCounter(hb) {
    var cnthb = hb.querySelector('.count');
    if(cnthb) {
        var cnt = cnthb.textContent;
        cnt = +cnt;
        cnthb.textContent = cnt + 1;
    } else {
        var cnthb = document.createElement('span');
        cnthb.classList.add('count');
        cnthb.textContent = '1';
        hb.appendChild(cnthb);
    }
}

sendBtnEl.onclick = chunkSend;
chatToAllEl.onclick = talkToSpecificPerson('all');

function chunkSend() {
    var chunk = messageInputEl.value;
    if(chunk == '') return;

    //send a socket message with the following format
    //destination|message, e.g. Andi|Hello, world
    socket.send(rcvr + '~' + chunk );
    messageInputEl.value = '';


    var deliv = usernameInputEl.value;
    //also put our conversation in the message board
    receiveChunk(deliv, chunk, rcvr);
    //scroll to the bottom to see the newest message
    messageBoardEl.scrollTop = messageBoardEl.scrollHeight;
}

function talkToSpecificPerson(person) {
    return function(e) {
        //remove the notification of how many new messages
        var cnt = usernameListEl.querySelector('#' + person + '>.count');
        if(cnt) cnt.remove();

        chatToLabelEl.textContent = person;
        rcvr = person;
        messageBoardEl.innerHTML = '';

        //Show all conversation from the username we are chatting to
        var talkPrg = chatRoom[rcvr];
        if(!talkPrg) return;
        var docFrag = document.createDocumentFragment();
        talkPrg.forEach(function (talk) {
        	docFrag.appendChild(talk);
        });
        messageBoardEl.appendChild(docFrag);
    }

}