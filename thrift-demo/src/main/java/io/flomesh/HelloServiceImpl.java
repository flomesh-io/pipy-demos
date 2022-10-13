package io.flomesh;

import io.flomesh.HelloService;
import org.apache.thrift.TException;

import java.net.InetAddress;
import java.net.UnknownHostException;

public class HelloServiceImpl implements HelloService.Iface {
    @Override
    public String greeting(String name) throws TException {
        String addr = "";
        try {
            addr = InetAddress.getLocalHost().toString();
        } catch (UnknownHostException e) {
            addr = System.getenv("HOSTNAME");
        }
        return String.format("Hello %s, response from %s", name, addr);
    }
}
