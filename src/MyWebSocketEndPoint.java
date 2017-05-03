
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Collections;

// Websockets
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

// Maaping USERNAME_KEY = "username" -> person 
@ServerEndpoint(value = "/chat")
public class MyWebSocketEndPoint {

	//private static final String USERNAME_KEY = "username";
	// SC - This map is taken static because all the persons need to be shown in the list, hence we dont want to create a separate instance every time
	private static Map<String, Session> persons = Collections.synchronizedMap(new LinkedHashMap<String, Session>());
	
	@OnOpen
	public void onOpen(Session websocOpen) throws Exception {

	    //Get the new socket's username from url
	    //e.g. url: ws://localhost:8080/chat?username=Andi, so Andi is the username
	    Map<String, List<String>> attribute = websocOpen.getRequestParameterMap();
	    List<String> lsPrsn = attribute.get("person");
	    String addPerson = lsPrsn.get(0);
	    System.out.println("User " + addPerson + " joined the chat room");
	    //Add the new socket to the collection
	    persons.put(addPerson, websocOpen);

	    //also set username property of the session.
	    //so when there a new message from a particular socket's session obj
	    //we can get the username whom send the message
	    websocOpen.getUserProperties().put("person", addPerson);

	    //Give a list current online users to the new socket connection
	    //because we store username as the key of the map, we can get all
	    //  username list from the map's keySet
	    String reply = "newUser~" + String.join("~", persons.keySet());
	    websocOpen.getBasicRemote().sendText(reply);

	    //Loop through all socket's session obj, then send a text message
	    for (Session slave : persons.values()) {
	        if(slave == websocOpen) continue;
	        slave.getBasicRemote().sendText("newUser~" + addPerson);
	    }
	}

	@OnMessage
	public void onMessage(Session websocOnMsg, String chunk) throws Exception {
	    //Extract the information of incoming message.
	    //Message format: 'From|Message'
	    //so we split the incoming message with '|' token
	    //to get the destination and message content data
	    String[] msg = chunk.split("\\~");
	    String receiver = msg[0]; String msgBody = msg[1];

	    //Retrieve the sender's username from it's property
	    String getPerson = (String)websocOnMsg.getUserProperties().get("person");

	    //Deliver the message according to the destination
	    //Outgoing Message format: "message|sender|content|messageType?"
	    //the message type is optional, if the message is intended to be broadcast
	    //  then the message type value is "|all"
	    if(receiver.equals("all")) {
	        //if the destination chat is 'all', then we broadcast the message
	        for (Session client : persons.values()) {
	            if(client.equals(websocOnMsg)) continue;
	            client.getBasicRemote().sendText("message~" + getPerson + "~" + msgBody + "~all" );
	        }
	    } else {
	        //find the username to be sent, then deliver the message
	        Session slave = persons.get(receiver);
	        String reply = "message~" + getPerson + "~" + msgBody;
	        slave.getBasicRemote().sendText(reply);
	    }
	}

	@OnClose
	public void onClose(Session websocClose) throws Exception {
	    //remove client from collecton  
	    String persn = (String)websocClose.getUserProperties().get("person");
	    persons.remove(persn);
	    
	    //broadcast to all people, that the current user is leaving the chat room
	    for (Session slave : persons.values()) {
	        slave.getBasicRemote().sendText("removeUser~" + persn);
	    }
	}
}
