package io.flomesh;

import org.apache.thrift.TException;
import org.apache.thrift.protocol.TBinaryProtocol;
import org.apache.thrift.protocol.TProtocol;
import org.apache.thrift.transport.TSocket;
import org.apache.thrift.transport.TTransportException;

import java.net.SocketException;

public class HelloClient {
    public static void main(String[] args) {
        String targetHost = "localhost";
        Integer targetPort = 9090;
        int countDown = 0;
        if (args.length > 0) {
            targetHost = args[0];
        }
        if (args.length > 1) {
            targetPort = Integer.valueOf(args[1]);
        }
        if (args.length > 2) {
            countDown = Integer.valueOf(args[2]);
        }
        HelloService.Client client;
        client = connect(targetHost, targetPort);

        if (client == null) {
            return;
        }
        while (true) {
            try {
                Thread.sleep(1000);
                String greeting = client.greeting("Flomesh");
                System.out.println(greeting);
                if (--countDown == 0) {
                    return;
                }
            } catch (TException e) {
                e.printStackTrace();
                if (e.getCause() instanceof SocketException) {
                    client = connect(targetHost, targetPort);
                }
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }

    private static HelloService.Client connect(String targetHost, Integer targetPort) {
        HelloService.Client client;
        try {
            TSocket socket = new TSocket(targetHost, targetPort);
            socket.open();
            TProtocol protocol = new TBinaryProtocol(socket);
            client = new HelloService.Client(protocol);
            System.out.printf("Connection to %s:%d\n", targetHost, targetPort);
        } catch (TTransportException e) {
            throw new RuntimeException(e);
        }
        return client;
    }
}
