package io.flomesh;

import org.apache.thrift.server.TServer;
import org.apache.thrift.server.TThreadPoolServer;
import org.apache.thrift.transport.TServerSocket;
import org.apache.thrift.transport.TServerTransport;
import org.apache.thrift.transport.TTransportException;

public class HelloServer {
    public static void main(String[] args) {
        HelloServiceImpl impl = new HelloServiceImpl();
        HelloService.Processor<HelloServiceImpl> processor = new HelloService.Processor<>(impl);

        Runnable runnable = () -> {
            try {
                int port = 9090;
                TServerTransport serverSocket = new TServerSocket(port);
                TServer server = new TThreadPoolServer(new TThreadPoolServer.Args(serverSocket).processor(processor));
                System.out.println("Starting server listening on " + port);
                server.serve();
            } catch (TTransportException e) {
                e.printStackTrace();
            }
        };

        new Thread(runnable).start();
    }
}
