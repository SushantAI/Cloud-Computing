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
var destination = 'all';

//Chat room that holds every conversation
var chatRoom = {
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
    var eventName = e.data.substr(0, e.data.indexOf("|"));
    var data = e.data.substr(e.data.indexOf("|") + 1);

    var fn;
    if(eventName == 'newUser') fn = newUser;
    else if(eventName == 'removeUser') fn = removeUser;
    else if(eventName == 'message') fn = getMessage;

    fn.apply(null, data.split('|'));
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

function newUser() {
    //if there is no users, return from the function
    if(arguments.length == 1 && arguments[0] == "") return;
    var usernameList = arguments;

    //Loop through all online users
    //foreach user, create a list with username as it's id and content
    //when the list is clicked, change the chat target to that user
    var documentFragment = document.createDocumentFragment();
    for(var i = 0; i < usernameList.length; i++) {
        var username = usernameList[i];
        var liEl = document.createElement("li");
        liEl.id = username;
        liEl.textContent = username;
        if(username != usernameInputEl.value) {
            //we can chat to everyone in the chat room
            //except our self
            liEl.onclick = chatToFn(username);
            liEl.classList.add('hoverable');
        }
        documentFragment.appendChild(liEl);
    }
    usernameListEl.appendChild(documentFragment);
}

function getMessage(sender, message, destination) {
        //destination
        destination = destination || sender;

        //if the current chat is the same as the incoming message destination
        //then add it to the conversation
        //else notify the user that there is an incoming message
        if(destination == destination) {
            var newChatEl = createNewChat(sender, message);
            messageBoardEl.appendChild(newChatEl);
        } else {
            var toEl = usernameListEl.querySelector('#' + destination);
            addCountMessage(toEl);
        }

        //push the incoming message to the conversation
        if(chatRoom[destination]) chatRoom[destination].push(newChatEl);
        else chatRoom[destination] = [newChatEl];
}

function removeUser(removedUsername) {
    //remove the user from the username list
    usernameListEl.querySelector('#' + removedUsername).remove();
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
function createNewChat(sender, message) {
    var newChatDivEl = document.createElement('div');
    var senderEl = document.createElement('span');
    var messageEl = document.createElement('span');

    if(sender == usernameInputEl.value) sender = 'me';

    senderEl.textContent = sender;
    messageEl.textContent = message;

    newChatDivEl.appendChild(senderEl);
    newChatDivEl.appendChild(messageEl);
    return newChatDivEl;
}

function addCountMessage(toEl) {
    var countEl = toEl.querySelector('.count');
    if(countEl) {
        var count = countEl.textContent;
        count = +count;
        countEl.textContent = count + 1;
    } else {
        var countEl = document.createElement('span');
        countEl.classList.add('count');
        countEl.textContent = '1';
        toEl.appendChild(countEl);
    }
}

sendBtnEl.onclick = sendMessage;
chatToAllEl.onclick = chatToFn('all');

function sendMessage() {
    var message = messageInputEl.value;
    if(message == '') return;

    //send a socket message with the following format
    //destination|message, e.g. Andi|Hello, world
    socket.send(destination + '|' + message );
    messageInputEl.value = '';


    var sender = usernameInputEl.value;
    //also put our conversation in the message board
    getMessage(sender, message, destination);
    //scroll to the bottom to see the newest message
    messageBoardEl.scrollTop = messageBoardEl.scrollHeight;
}

function chatToFn(username) {
    return function(e) {
        //remove the notification of how many new messages
        var countEl = usernameListEl.querySelector('#' + username + '>.count');
        if(countEl) countEl.remove();

        chatToLabelEl.textContent = username;
        destination = username;
        messageBoardEl.innerHTML = '';

        //Show all conversation from the username we are chatting to
        var conversationList = chatRoom[destination];
        if(!conversationList) return;
        var df = document.createDocumentFragment();
        conversationList.forEach(function (conversation) {
            df.appendChild(conversation);
        });
        messageBoardEl.appendChild(df);
    }

}