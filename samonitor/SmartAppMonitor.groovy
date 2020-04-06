package samonitor

import org.codehaus.groovy.ast.expr.BooleanExpression
import org.codehaus.groovy.ast.ClassCodeVisitorSupport
import org.codehaus.groovy.ast.ClassNode
import org.codehaus.groovy.ast.MethodNode
import org.codehaus.groovy.ast.expr.ClosureExpression
import org.codehaus.groovy.ast.expr.ConstantExpression
import org.codehaus.groovy.ast.expr.Expression
import org.codehaus.groovy.ast.expr.MapEntryExpression
import org.codehaus.groovy.ast.expr.MapExpression
import org.codehaus.groovy.ast.expr.MethodCallExpression
import org.codehaus.groovy.ast.expr.NamedArgumentListExpression
import org.codehaus.groovy.ast.expr.TernaryExpression
import org.codehaus.groovy.ast.expr.VariableExpression
import org.codehaus.groovy.ast.stmt.IfStatement
import org.codehaus.groovy.ast.stmt.Statement
import org.codehaus.groovy.classgen.GeneratorContext
import org.codehaus.groovy.control.CompilePhase
import org.codehaus.groovy.control.SourceUnit
import org.codehaus.groovy.control.customizers.CompilationCustomizer
import org.codehaus.groovy.transform.GroovyASTTransformation

import java.sql.*;
import groovy.sql.Sql

import java.time.temporal.ValueRange

@GroovyASTTransformation(phase = CompilePhase.SEMANTIC_ANALYSIS)
class SmartAppMonitor extends CompilationCustomizer{

    OutFile of
    int numberOfLineAdded
    List<Map> closureDeviceNames

    Set<String> deviceNames
    Set<String> inputDeviceNames
    Set<String> outputDeviceNames
    Set<String> eventNames
    Set<String> handlerMethodNames
    Set<String> actionNames
    Set<String> methodNames
    Set<String> eventHandlerPairs

    List<Map> insertCodeMap
    Set<Map> deviceNames2
    Set<Map> device_handlerPair
    Set<Map> method_returnPair

    Set<Map> receiver_actionPair

    Set<String> actionSet
    Set<Map> ternaryLineNumber

    List<String> pageNames
    Set<String> scheduleMethodNames
    Set<Map> scheduleTimeandMethod

    Set<Map> inputVariableNames
    Set<Map> methodParameterNames

    boolean skipMethod
    boolean inIfStat
    boolean inHandler
    boolean isTernary
    int preferenceStartLine
    boolean isPage

    int firstPageLineNumber
    int lastPageLineNumber
    Set<String> ignoreMethodNames

    int currentLineNum
    int actionId

    String currentMethod

    public SmartAppMonitor()
    {
        super(CompilePhase.SEMANTIC_ANALYSIS)
        numberOfLineAdded = 0
        closureDeviceNames = new ArrayList<Map>()

        deviceNames = new HashSet<String>()
        inputDeviceNames = new HashSet<String>()
        outputDeviceNames = new HashSet<String>()
        eventNames = new HashSet<String>()
        handlerMethodNames = new HashSet<String>()
        actionNames = new HashSet<String>()
        methodNames = new HashSet<String>()
        eventHandlerPairs = new HashSet<String>()
        insertCodeMap = new ArrayList<Map>()
        deviceNames2 = new HashSet<Map>()

        device_handlerPair = new HashSet<Map>()
        method_returnPair = new HashSet<Map>()

        receiver_actionPair = new HashSet<Map>()

        actionSet = new HashSet<String>()
        ternaryLineNumber = new HashSet<Map>()

        pageNames = new ArrayList<String>()
        scheduleMethodNames = new HashSet<String>()
        scheduleTimeandMethod = new HashSet<Map>()

        inputVariableNames = new HashSet<Map>()
        methodParameterNames = new HashSet<Map>()

        skipMethod = true
        inIfStat = false
        inHandler = false
        isTernary = false
        preferenceStartLine = 0
        isPage = false

        firstPageLineNumber = 0
        lastPageLineNumber = 0

        actionId = 0
        currentLineNum = 0
        ignoreMethodNames = new HashSet<String>()

        currentMethod = new String()

    }

    @Override
    void call(SourceUnit source, GeneratorContext context, ClassNode classNode) {
        MethodDecVisitor mdv = new MethodDecVisitor()
        classNode.visitContents(mdv)

        for(String p : pageNames) {
            methodNames.remove(p)
        }
        for(String i : ignoreMethodNames) {
            methodNames.remove(i)
        }

        MyCodeVisitor mcv = new MyCodeVisitor()
        classNode.visitContents(mcv)
        insertCodeMap.sort({m1, m2 -> m1.lineNumber <=> m2.lineNumber})


        for(Map m : insertCodeMap) {
            codeInsert(m.get("code"), m.get("lineNumber"), m.get("addedLine"), m.get("exception"))
        }

        println of.getText()
    }
    class MethodDecVisitor extends ClassCodeVisitorSupport {

        // store method information that return devices in method_returnPair
        @Override
        void visitMethod(MethodNode meth)
        {
            def methName = meth.getName()
            if(!methName.equals("main") && !methName.equals("run") && !methName.equals("installed") && !methName.equals("updated") && !methName.equals("initialize")) {

                def f = of.getFile()
                def lines = f.readLines()
                def lastLines = lines.get(meth.getLastLineNumber()-1)
                def notHandler = true
                if(!deviceNames2.isEmpty()) {
                    for (Map m : deviceNames2) {
                        if (lastLines != null && m.containsKey("name")) {
                            if (lastLines.contains(m.get("name"))) {
                                method_returnPair.add(["method": methName, "return": m.get("name")])
                            }
                        }
                    }
                }
                if(!handlerMethodNames.isEmpty()) {
                    for(String s : handlerMethodNames) {
                        if(methName.equals(s)) notHandler = false
                    }
                    if(notHandler == true) {
                        methodNames.add(methName)
                    }
                }
                else {
                    methodNames.add(methName)
                }
            }
            else {

            }
            super.visitMethod(meth)
        }

        @Override
        void visitMethodCallExpression(MethodCallExpression mce) {
            def methText = mce.getMethodAsString()

            if(mce.getLineNumber() >= firstPageLineNumber && mce.getLastLineNumber() <= lastPageLineNumber) {
                ignoreMethodNames.add(methText)
            }

            // if the smart app has page structure -> store the first page's name in pageNames (ArrayList)
            if(methText.equals("page")) {
                isPage = true
                firstPageLineNumber = mce.getLineNumber()
                lastPageLineNumber = mce.getLastLineNumber()
                def args = mce.getArguments()
                args.getAt("expressions").each { exarg ->
                    if(exarg.getAt("text").toString().contains("name")) {
                        List<String> temp = exarg.getAt("text").toString().tokenize('[,]')
                        temp.each {
                            if(it.contains("name")) {
                                pageNames.add(it.tokenize(': ')[1])
                            }
                        }

                    }

                }
            }
            if(methText.equals("dynamicPage")){
                firstPageLineNumber = mce.getLineNumber()
                lastPageLineNumber = mce.getLastLineNumber()
            }

            // input part -> store the input devices in deviceNames2 (HashSet<Map>)
            if (methText.equals("input") || methText.equals("ifSet")) {
                def args = mce.getArguments()
                if (args.getAt("text").toString().contains("capability") || args.getAt("text").toString().contains("device") || args.getAt("text").toString().contains("attribute") || args.getAt("text").toString().contains("hub")) {
                    Map ma2 = [:]
                    args.each { arg ->
                        if (arg instanceof ConstantExpression) {
                            String text = arg.getText()
                            if (text.contains("capability") || text.contains("device") || text.contains("attribute")) {
                                if (text.contains("capability")) {
                                    ma2 += ["capability": arg.getText().substring(11)]
                                } else if (text.contains("device")) {
                                    ma2 += ["capability": arg.getText().substring(7)]
                                } else if (text.contains("attribute")) {
                                    ma2 += ["capability": arg.getText().substring(10)]
                                }
                            }
                            else if(text.contains("hub")) {
                                ma2 += ["name": text, "capability": text]
                            }
                            else {
                                ma2 += ["name": arg.getText()]
                            }
                        }

                        if (arg instanceof MapExpression) {
                            Map ma = [:]
                            arg.getMapEntryExpressions().each { m ->
                                if (m.getKeyExpression().getText().equals("name")) {
                                    deviceNames.add(m.getValueExpression().getText())
                                    ma = ["name": m.getValueExpression().getText()]
                                }
                                if (m.getKeyExpression().getText().equals("type")) {
                                    def text = m.getValueExpression().getText()
                                    if (text.contains("capability.") || text.contains("device") || text.contains("attribute")) {
                                        if (text.contains("capability")) {
                                            ma += ["capability": text.substring(11)]
                                        } else if (text.contains("device")) {
                                            ma += ["capability": text.substring(7)]
                                        } else if (text.contains("attribute")) {
                                            ma += ["capability": text.substring(10)]
                                        }
                                        if(ma != null && !ma.isEmpty())
                                            deviceNames2.add(ma)
                                    }
                                }

                            }
                        }
                    }
                    if(ma2 != null && !ma2.isEmpty())
                        deviceNames2.add(ma2)
                }
                else {
                    currentLineNum = mce.getLineNumber()
                    String type
                    String name
                    args.each { arg ->
                        if (arg instanceof ConstantExpression) {
                            String s = arg.getText()
                            if(arg.getLineNumber() == currentLineNum) {
                                if(s.equals("text") || s.equals("enum") || s.equals("bool") || s.equals("boolean") || s.equals("decimal") || s.equals("email") || s.equals("number") || s.equals("password") || s.equals("time") || s.equals("mode") || s.equals("contact"))
                                    type = s
                                else if(s.equals("phone")) {
                                    type = s
                                    name = s
                                }
                                else {
                                    name = s
                                }
                            }
                        }
                        else if (arg instanceof MapExpression) {
                            arg.getMapEntryExpressions().each { mee ->
                                if (mee.getKeyExpression().getText().equals("name")) {
                                    name = mee.getValueExpression().getText()
                                }
                                if(mee.getKeyExpression().getText().equals("type")) {
                                    type = mee.getValueExpression().getText()
                                }
                            }
                        }
                    }
                    inputVariableNames.add(["name": name, "type": type])
                }
            }
            if(methText.equals("subscribe") || methText.equals("subscribeToCommand")) {
                def args = mce.getArguments()
                def arg0
                def arg1
                def arg2
                def eventN

                if(args[0] instanceof VariableExpression) {
                    arg0 = (VariableExpression) args[0]
                    if(args.size() == 3) {

                    }
                    else {
                        eventN = arg0.getName()
                        eventNames.add(eventN)
                    }
                }

                if(args[1] instanceof ConstantExpression) {
                    arg1 = (ConstantExpression) args[1]
                    eventN = arg1.getText()
                    eventNames.add(arg1.getText())
                }
                if(args[1] instanceof VariableExpression) {
                    arg1 = (VariableExpression) args[1]
                    //handlerMethodNames.add(argvex1.getName())
                    if(args.size() == 3) {
                        eventN = arg1.getName()
                        eventNames.add(eventN)
                    }
                    else {
                        handlerMethodNames.add(arg1.getName())
                        eventHandlerPairs.add(eventN+"-"+arg1.getName())
                    }
                }

                if(args[2] instanceof VariableExpression) {
                    arg2 = (VariableExpression) args[2]
                    handlerMethodNames.add(arg2.getName())
                    eventHandlerPairs.add(eventN+"-"+arg2.getName())
                }
            }

            // if the smart app has schedule methods like schedule, runEveryXMinutes, ... etc, store the method names in scheduleMethodNames (HashSet<String>)
            if(methText.equals("schedule")) {
                String temp = mce.getArguments().getAt("text").toString()
                List<String> temp2 = temp.tokenize(',')
                String time = temp2[0].substring(1)
                if(!Character.isDigit(time.charAt(0)) || !time.contains("*"))
                    time = "\${" + time + "}"
                List<String> temp3
                if(temp2.size() == 2)
                    temp3 = temp2[1].substring(0, temp2[1].length()-1).tokenize(' ')
                else if(temp2.size() == 3)
                    temp3 = temp2[1].tokenize(' ')
                String handler = temp3[0]
                scheduleMethodNames.add(handler)
                scheduleTimeandMethod.add(["time": time, "method": handler])
            }

            if(methText.equals("runIn")) {
                // example: runIn(findFalseAlarmThreshold() * 60, "takeAction", [overwrite: false])
                String temp = mce.getArguments().getAt("text").toString()
                List<String> temp2 = temp.tokenize(',')
                String time = temp2[0].substring(1)
                List<String> temp3 = temp2[1].tokenize(' )');
                String handler = temp3[0]
                scheduleMethodNames.add(handler)
                scheduleTimeandMethod.add(["time": "After " + time, "method": handler])
            }
            if(methText != null && methText.contains("runEvery")) {
                List<String> temp = methText.tokenize('runEveryMitsHo')
                String time = temp[0]
                String temp2 = mce.getArguments().getAt("text").toString()
                List<String> temp3 = temp2.tokenize('()')
                String handler = temp3[0]
                scheduleMethodNames.add(handler)
                scheduleTimeandMethod.add(["time": methText, "method": handler])
            }
            if(methText.equals("runOnce")) {
                String temp = mce.getArguments().getAt("text").toString()
                List<String> temp2 = temp.tokenize(',')
                String time = temp2[0].substring(1)
                List<String> temp3
                if(temp2.size() == 2)
                    temp3 = temp2[1].substring(0, temp2[1].length()-1).tokenize(' ')
                else if(temp2.size() == 3)
                    temp3 = temp2[1].tokenize(' ')
                String handler = temp3[0]
                scheduleMethodNames.add(handler)
                scheduleTimeandMethod.add(["time": methText, "method": handler])

            }

            if(methText != null ) {
                def recver = mce.getReceiver()
                if(!methText.contains("runScript")) {
                    if (!recver.getText().equals("this") && !recver.getText().equals("log")) {
                        Map ma = [:]
                        for (String s : actionSet) {
                            if (s.equals(methText)) {
                                ma = ["actionId": actionId, "receiver": recver.getText(), "action": methText]
                                actionId++
                                if (ma != null) {
                                    receiver_actionPair += ma
                                    actionNames.add(recver.getText() + "." + methText)
                                }
                            }
                        }
                    }
                    else {
                        if(methText.equals("sendPush") || methText.equals("sendSms") || methText.equals("sendNotification") || methText.equals("setLocationMode")) {
                            actionNames.add(methText)
                        }
                    }
                }

            }


            super.visitMethodCallExpression(mce)
        }


        @Override
        void visitTernaryExpression(TernaryExpression tre) {
            BooleanExpression be = tre.getBooleanExpression()
            Expression te = tre.getTrueExpression()
            Expression fe = tre.getFalseExpression()

            if(be.hasProperty("receiver")) {
                String temp = be.getText()
                def temp2 = temp.tokenize('.(')
                for(String s : actionSet) {
                    if(temp2[1].equals(s)) {
                        Map a = ["lineNumber": tre.getLineNumber(), "colNumber": be.getColumnNumber()]
                        ternaryLineNumber.add(a)
                    }
                }
            }
            if(te.hasProperty("receiver")) {
                def temp = te.getText()
                def temp2 = temp.tokenize('.(')
                for(String s : actionSet) {
                    if(temp2[1].equals(s)) {
                        Map a = ["lineNumber": tre.getLineNumber(), "colNumber": te.getColumnNumber()]
                        ternaryLineNumber.add(a)
                    }
                }
            }
            if(fe.hasProperty("receiver")) {
                def temp = fe.getText()
                def temp2 = temp.tokenize('.(')
                for(String s : actionSet) {
                    if(temp2[1].equals(s)) {
                        Map a = ["lineNumber": tre.getLineNumber(), "colNumber": fe.getColumnNumber()]
                        ternaryLineNumber.add(a)
                    }
                }
            }
        }

        @Override
        protected SourceUnit getSourceUnit() {
            return null;
        }
    }

    class MyCodeVisitor extends ClassCodeVisitorSupport{

        @Override
        void visitMethod(MethodNode meth)
        {
            def methName = meth.getName()
            def param
            def deviceN
            def deviceC
            def index

            currentMethod = methName

            // get the method's parameters - ex. evt
            meth.getParameters().each { p ->
                param = p.getAt("name")
            }

            // if the method is event handler method, get the device information
            for(Map m : device_handlerPair) {
                if(m.get("handler").equals(methName)) {
                    deviceN = m.get("device")
                }
            }
            for(Map m : deviceNames2) {
                if(deviceN == m.get("name")) {
                    deviceC = m.get("capability")

                }
            }
            for(Map m : receiver_actionPair) {
                if(deviceN != null && deviceN == m.get("receiver"))
                    index = m.get("actionId")
            }
            if(!methName.equals("main") && !methName.equals("run") && !methName.equals("installed") && !methName.equals("updated") && !methName.equals("initialize")) {
                skipMethod = false
                inHandler = false
                for(String s : handlerMethodNames) {
                    if(methName.equals(s)) { //if the method is handler method
                        inHandler = true
                        if(meth.getLineNumber() == meth.getLastLineNumber()) {
                            break
                        }
                        else {
                            //String code = "\t//Inserted Code\n"
                            String code = ""
                            String eventN = "";
                            if (deviceN.toString().equals("app") || deviceN.toString().equals("location")) {
                                code += "\tstate.accessToken = " + param + ".id\n"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"\${" + param + ".value}\", \"\${" + param + ".value}\", \"" + deviceN + "\", \"event\", \"\${" + param + ".id}\", \"\${" + param + ".id}\")\n"

                            } else {
                                code += "\tstate.accessToken = " + param + ".id\n"
                                //code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"\${" + param + ".value}\", \"" + deviceC + "\", \"\${" + param + ".getDevice()}\", \"event\", \"\${" + param + ".id}\", \"\${" + param + ".id}\")"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"\${" + param + ".value}\", \"\${" + param + ".getDevice().capabilities[0]}\", \"\${" + param + ".getDevice()}\", \"event\", \"\${" + param + ".id}\", \"\${" + param + ".id}\")\n"
                            }
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"handlerMethod\", \"this\", \"handlerMethod\", \"\${" + param + ".id}\", \"\${" + param + ".id}\")"
                            if(meth.getLineNumber()+2 <= meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 3, "exception": 0])
                            else if(meth.getLineNumber()+1 == meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 3, "exception": 0])
                            //code = "\t//Inserted Code\n"
                            //code = ""
                            //code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"handlerMethod\", \"this\", \"handlerMethod\", \"\${" + param + ".id}\", \"\${" + param + ".id}\")"

                            //insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 1, "exception": 0])

                            break
                        }
                    }
                }
                if(inHandler == false) { //if the method is not handler method
                    String sche = ""
                    String scheduleTime = ""
                    for(String s : scheduleMethodNames) {
                        if (methName.equals(s)) {
                            sche = "scheduleMethod"
                        }
                        for(Map m : scheduleTimeandMethod) {
                            if(m.get("method").toString().equals(methName)) {
                                scheduleTime = m.get("time").toString()
                            }

                        }
                    }
                    if(meth.getLineNumber() == meth.getLastLineNumber()) { // if the method has only one line
                        // code = "\t//Inserted Code\n"
                        String code = ""
                        if(sche != "") {
                            code += "\tdef id = state.accessToken\n"
                            code += "\tcreateAccessToken()\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + scheduleTime + "\", \"time\", \"this\", \"event\", \"\${state.accessToken}\", \"\${id}\")\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"" + sche + "\", \"this\", \"handlerMethod\", \"\${state.accessToken}\", \"\${id}\")"
                            if(meth.getLineNumber()+2 <= meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 4, "exception": 2]) //exception: 2
                            else if(meth.getLineNumber()+1 == meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 4, "exception": 2]) //exception: 2
                            //code = "\t//Inserted Code\n"
                            //code = ""
                            //code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"" + sche + "\", \"this\", \"handlerMethod\", \"\${state.accessToken}\", \"\${id}\")"
                            //insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 1, "exception": 2]) //exception: 2
                        }
                        else {
                            code += "\tdef id = state.accessToken\n"
                            code += "\tcreateAccessToken()\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"methodCall\", \"this\", \"methodCall\", \"\${state.accessToken}\", \"\${id}\")"
                            //if(options[0].toString().equals("all"))
                            for(String s : methodNames) {
                                if(methName.equals(s)) {
                                    if(meth.getLineNumber()+2 <= meth.getFirstStatement().getLineNumber())
                                        insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 3, "exception": 2]) //exception: 2
                                    else if(meth.getLineNumber()+1 == meth.getFirstStatement().getLineNumber())
                                        insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 3, "exception": 2]) //exception: 2
                                    break
                                }
                            }
                        }
                    }
                    else {
                        //String code = "\t//Inserted Code\n"
                        String code = ""
                        if(sche != "") {
                            code += "\tdef id = state.accessToken\n"
                            code += "\tcreateAccessToken()\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + scheduleTime + "\", \"time\", \"this\", \"event\", \"\${state.accessToken}\", \"\${id}\")\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"" + sche + "\", \"this\", \"handlerMethod\", \"\${state.accessToken}\", \"\${id}\")"
                            if(meth.getLineNumber()+2 <= meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 4, "exception": 0])
                            else if(meth.getLineNumber()+1 == meth.getFirstStatement().getLineNumber())
                                insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 4, "exception": 0])
                            //code = "\t//Inserted Code\n"
                            //code = ""
                            //code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"" + sche + "\", \"this\", \"handlerMethod\", \"\${state.accessToken}\", \"\${id}\")"
                            //insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 1, "exception": 0])

                        }
                        else {
                            code += "\tdef id = state.accessToken\n"
                            code += "\tcreateAccessToken()\n"
                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"methodCall\", \"this\", \"methodCall\", \"\${state.accessToken}\", \"\${id}\")"

                            for(String s : methodNames) {
                                if(methName.equals(s)) {
                                    if(meth.getLineNumber()+2 <= meth.getFirstStatement().getLineNumber()) {
                                        //println "case 1: " + methName + " " + meth.getLineNumber() + " " + meth.getFirstStatement().getLineNumber()
                                        insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 3, "exception": 0])
                                    }
                                    else if(meth.getLineNumber()+1 == meth.getFirstStatement().getLineNumber()) {
                                        //println "case 2: " + methName + " " + meth.getLineNumber() + " " + meth.getFirstStatement().getLineNumber()
                                        insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 3, "exception": 0])
                                    }

                                    break
                                }
                            }

                        }
                    }
                }
            }

            else if(methName.equals("run")) {
                numberOfLineAdded = 0
                skipMethod = true
            }

            // when the smartapp - install
            else if(methName.equals("installed")) {
                //String code = "\t//Inserted Code\n"
                String code = ""
                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methName + "\", \"methodCall\", \"this\", \"methodCall\", \"\${settings}\")"
                code += "\n\tcreateAccessToken()"
                if(meth.getFirstStatement() != null) {
                    insertCodeMap.add(["code": code, "lineNumber": meth.getFirstStatement().getLineNumber(), "addedLine": 2, "exception": 0])
                }
                else {
                    if (meth.getLineNumber() == meth.getLastLineNumber()) { // if there is not any content in installed method
                        insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber(), "addedLine": 2, "exception": 2])
                    }
                    else {
                        insertCodeMap.add(["code": code, "lineNumber": meth.getLineNumber()+1, "addedLine": 2, "exception": 0])
                    }
                }

            }
            super.visitMethod(meth)
        }

        @Override
        void visitMethodCallExpression(MethodCallExpression mce) {
            def methText = mce.getMethodAsString()

            if(methText.equals("preferences")){
                if(isPage == true) { //if the smartapp's preference has page structures
                    //String code = "\t//Inserted Code\n"
                    String code = ""
                    code += "\tpage(name: \"Select SmartApp Monitor Page\", nextPage: \"" + pageNames[0] + "\", uninstall: true) {\n"
                    code += "\t\tsection(\"Select SmartAppMonitor\") {\n" + "\t\t\tinput \"smartAppMonitor\", \"capability.execute\"\n" + "\t\t}\n"
                    code += "\t\tsection(\"Enter an id for monitoring\") {\n" + "\t\t\tinput \"monitoringID\", \"text\", required: true\n" + "\t\t}"
                    code += "\n\t}"
                    insertCodeMap.add(["code": code, "lineNumber": mce.getLineNumber()+1, "addedLine": 8, "exception": 0])

                }
                else { //if the smartapp's preference doesn't have any page structure
                    //String code = "\t//Inserted Code\n"
                    String code = ""
                    code += "\tsection(\"Select SmartAppMonitor\") {\n" + "\t\tinput \"smartAppMonitor\", \"capability.execute\"\n" + "\t}\n"
                    code += "\tsection(\"Enter an id for monitoring\") {\n" + "\t\tinput \"monitoringID\", \"text\", required: true\n" + "\t}"
                    insertCodeMap.add(["code": code, "lineNumber": mce.getLineNumber()+1, "addedLine": 6, "exception": 0])

                }

            }

            // subscribe part - store the input devices and handler methods in device_handlerPair
            if(methText.equals("subscribe") || methText.equals("subscribeToCommand")) {
                def args = mce.getArguments()
                def deviceN
                def handlerN

                if(args[0] instanceof VariableExpression) {
                    VariableExpression argvex0 = (VariableExpression) args[0]
                    inputDeviceNames.add(argvex0.getName())
                    deviceN = argvex0.getName()
                }

                if(args[1] instanceof VariableExpression) {
                    VariableExpression argvex1 = (VariableExpression) args[1]
                    handlerN = argvex1.getName()
                }

                if(args[2] instanceof VariableExpression) {
                    VariableExpression argvex2 = (VariableExpression) args[2]
                    handlerN = argvex2.getName()
                }
                device_handlerPair.add([device:deviceN, handler:handlerN])
            }

            if(!skipMethod) {
                // if action -> code insert
                // if send message -> code insert
                if(methText != null ) {
                    if (methText.toLowerCase().contains("state") || methText.toLowerCase().contains("value") || methText.toLowerCase().contains("event")) {

                    } else if (methText.contains("mappings")) {

                    } else if (methText.contains("find") || methText.contains("collect")) {

                    } else if (methText.contains("size") || methText.contains("count")) {

                    } else if (methText.contains("hasCapability")) {

                    } else if (methText.contains("each") || methText.contains("eachWithIndex")) {  // if the smartapp use the devices variable with closure
                        closureDeviceNames = new ArrayList<Map>()
                        def recver = mce.getReceiver()
                        mce.getAt("arguments").each { a ->
                            if (a instanceof ClosureExpression) {
                                if (a.getParameters()) {  // if the closure has parameters
                                    a.getParameters().each { a_p ->
                                        if (recver instanceof VariableExpression) {
                                            VariableExpression recvex = (VariableExpression) recver
                                            def realDevice
                                            def closureDevice
                                            def capa
                                            for (Map m : deviceNames2) {
                                                if (recvex.getName().equals(m.get("name"))) {
                                                    realDevice = m.getAt("name")
                                                    closureDevice = a_p.getAt("name")
                                                    capa = m.get("capability")
                                                }
                                            }
                                            closureDeviceNames.add(["realDevice": realDevice, "closureDevice": closureDevice, "capability": capa])
                                        }
                                    }
                                } else { // it the closure doesn't have any parameters
                                    if (recver instanceof VariableExpression) {
                                        VariableExpression recvex = (VariableExpression) recver
                                        def realDevice
                                        def closureDevice
                                        def capa
                                        for (Map m : deviceNames2) {
                                            if (recvex.getName().equals(m.get("name"))) {
                                                realDevice = m.getAt("name")
                                                closureDevice = "it"
                                                capa = m.get("capability")
                                            }
                                        }
                                        closureDeviceNames.add(["realDevice": realDevice, "closureDevice": closureDevice, "capability": capa])
                                    }
                                }
                            }

                        }
                    } else {
                        def recver = mce.getReceiver()
                        boolean thereisaction = false // 만약 action method 가 존재하는데 action으로 인식하지 못하는 경우를 체크하는 변수
                        if (recver.getClass().toString().contains("MethodCallExpression")) { // if the method call's receiver is a method call expression
                            def deviceN
                            for (Map m : method_returnPair) {  // find the method's return value in method_returnPair
                                if (recver.getAt("methodAsString").equals(m.get("method"))) {
                                    deviceN = m.get("return")
                                }
                            }
                            for (Map m : deviceNames2) { // find the device in deviceNames2
                                if (deviceN.toString().equals(m.get("name"))) {
                                    thereisaction = true;
                                    //String code = "\t//Inserted Code\n"
                                    String code = ""
                                    if(inHandler == true)
                                        code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${evt.id}\")"
                                    else
                                        code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${id}\")"
                                    insertCodeMap.add(["code": code, "lineNumber": recver.getLineNumber() + 1, "addedLine": 1, "exception" :0])
                                }
                            }
                        }
                        if (recver instanceof VariableExpression) {
                            VariableExpression recvex = (VariableExpression) recver
                            def index
                            def delayOption
                            for(Map ma : receiver_actionPair) {
                                if(recvex.getName().equals(ma.get("receiver")))
                                    index = ma.get("actionId")
                            }
                            for (Map m : deviceNames2) {
                                if (recvex.getName().equals(m.get("name"))) {
                                    mce.getArguments().each {
                                        String arg = it.getText()
                                        if(arg.contains("delay")) {
                                            def d = arg.tokenize(':')[1]
                                            delayOption = d.substring(0, d.length()-1)
                                        }
                                    }
                                    for (Map m2 : ternaryLineNumber) {
                                        if (mce.getLineNumber() == m2.get("lineNumber")) {
                                            isTernary = true
                                            thereisaction = true
                                            outputDeviceNames.add(m.get("name"))
                                            //String code = "/*Inserted Code*/ "
                                            String code = ""
                                            //if (index != null) {
                                            if(inHandler == true)
                                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${evt.id}\")"
                                            else
                                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${id}\")"

                                            insertCodeMap.add(["code": code, "lineNumber": recvex.getLineNumber(), "addedLine": 0, "exception": 3])
                                            break
                                        }
                                    }
                                    thereisaction = true
                                    outputDeviceNames.add(m.get("name"))
                                    //String code = "\t//Inserted Code\n"
                                    String code = ""
                                    if(inHandler == true) {
                                        if(delayOption == null)
                                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${evt.id}\")"
                                        else
                                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${evt.id}\", [delay:" + delayOption + "])"
                                    }
                                    else {
                                        if(delayOption == null)
                                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${id}\")"
                                        else
                                            code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${id}\", [delay:" + delayOption + "])"
                                    }
                                    insertCodeMap.add(["code": code, "lineNumber": recvex.getLineNumber()+1, "addedLine": 1, "exception": 0])
                                }
                            }
                            for (Map m : closureDeviceNames) {
                                if (recvex.getName().equals(m.get("closureDevice"))) {
                                    thereisaction = true
                                    //String code = "\t//Inserted Code\n"
                                    String code = ""
                                    if(inHandler == true)
                                        code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${evt.id}\")"
                                    else
                                        code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"" + m.get("capability") + "\", \"\${" + m.get("name") + ".getName()}\", \"action\", \"\${" + m.get("name") + ".events(max: 1).get(0).id}\", \"\${id}\")"
                                    insertCodeMap.add(["code": code, "lineNumber": recvex.getLineNumber() + 1, "addedLine": 1, "exception": 0])
                                }
                            }

                        }
                        if (methText.equals("sendSms") || methText.equals("sendPush") || methText.equals("sendNotificationToContacts") || methText.equals("sendNotification")) {
                            thereisaction = true
                            //String code = "\t//Inserted Code\n"
                            String code = ""
                            if(inHandler == true) {
                                code += "\tcreateAccessToken()\n"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"send\", \"this\", \"action\", \"\${state.accessToken}\", \"\${evt.id}\")"
                            }
                            else {
                                code += "\tcreateAccessToken()\n"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"send\", \"this\", \"action\", \"\${state.accessToken}\", \"\${id}\")"
                            }
                            insertCodeMap.add(["code": code, "lineNumber": mce.getLineNumber()+1, "addedLine": 2, "exception": 0])

                        }
                        if (methText.equals("setLocationMode")) {
                            thereisaction = true
                            //String code = "\t//Inserted Code\n"
                            String code = ""
                            if(inHandler == true) {
                                code += "\tcreateAccessToken()\n"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"setLocationMode\", \"this\", \"action\", \"\${state.accessToken}\", \"\${evt.id}\")"
                            }
                            else {
                                code += "\tcreateAccessToken()\n"
                                code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"setLocationMode\", \"this\", \"action\", \"\${state.accessToken}\", \"\${id}\")"
                            }
                            insertCodeMap.add(["code": code, "lineNumber": mce.getLineNumber()+1, "addedLine": 2, "exception": 0])
                        }

                        if(thereisaction == false) {
                            for(String s : actionSet) {
                                if(s.equals(methText)) { // 만약 action method 가 존재하는데 action으로 인식하지 못하는 경우
                                    //String code = "\t//Inserted Code\n"
                                    String code = ""
                                    code += "\tcreateAccessToken()\n"
                                    code += "\tsmartAppMonitor.setData(app.getName(), \"\${monitoringID}\", \"" + methText + "\", \"Capability\", \"Devices\", \"action\", \"\${state.accessToken}\", \"\${id}\")"
                                    insertCodeMap.add(["code": code, "lineNumber": mce.getLineNumber()+1, "addedLine": 2, "exception": 0])
                                }
                            }
                        }
                    }
                }
            }


            super.visitMethodCallExpression(mce)

        }


        // if there is not any { and } in the if-else block
        @Override
        void visitIfElse(IfStatement ifElse) {
            Statement ifStat = ifElse.getIfBlock()
            Statement elseStat = ifElse.getElseBlock()
            if(!ifStat.getText().contains("{")) {
                if(ifElse.getLineNumber() == ifStat.getLineNumber()) { // if if-Stat doesn't have any { } and the stat has only one line
                    def code = of.getFile().readLines().get(ifStat.getLineNumber()+numberOfLineAdded)
                    def code2 = code.substring(ifStat.getColumnNumber()-1, ifStat.getLastColumnNumber()-1)
                    insertCodeMap.add(["code": code2, "lineNumber": ifStat.getLineNumber(), "addedLine": 1, "exception": 1]) //execption: 1
                }
                else { // if if-Stat doesn't have any { }
                    inIfStat = true
                    insertCodeMap.add(["code": "\t{", "lineNumber": ifStat.getLineNumber(), "addedLine": 1, "exception": 0])
                    insertCodeMap.add(["code": "\t}", "lineNumber": ifStat.getLineNumber() + 1, "addedLine": 1, "exception": 0])
                }
            }

            // i think this part has not completed yet
            if(!elseStat.getAt("class").toString().contains("EmptyStatement")) {
                if(!elseStat.getText().contains("{")) { //if else-stat doesn't have any { }
                    if(elseStat.hasProperty("ifBlock")) { // if the block is ifelse block
                        if (elseStat.getAt("ifBlock") != null) {

                        }
                    }
                    else {
                        if (elseStat.getColumnNumber() != -1) {
                            insertCodeMap.add(["code": "\t{", "lineNumber": elseStat.getLineNumber(), "addedLine": 1, "exception": 0])
                            insertCodeMap.add(["code": "\t}", "lineNumber": elseStat.getLineNumber() + 1, "addedLine": 1, "exception": 0])
                        }
                    }
                }
            }
            super.visitIfElse(ifElse)
        }

        @Override
        protected SourceUnit getSourceUnit() {
            return null;
        }
    }

    private void codeInsert(String code, int lineNum, int addLine, int exceptionBool) {
        if(lineNum >= 0) {
            def f = of.getFile()
            def lines = f.readLines()
            int numberOfLineAdded2 = 0
            if(exceptionBool == 1 || exceptionBool == 2 || exceptionBool == 3) { // case1 or case2 or case3
                if(exceptionBool == 1) { //case1: if if-block dont have { } and have only one line
                    File fileToBeModified = of.getFile()
                    String oldContent = ""
                    BufferedReader reader = new BufferedReader(new FileReader(fileToBeModified))
                    String line = reader.readLine()
                    int lineNum2 = 1;
                    while (line != null) {
                        if (lineNum + numberOfLineAdded + 1 == lineNum2) {
                            def temp_line = ""
                            if (line.substring(line.length() - code.length() - 1)[0] != ')') {
                                def temp_line1 = "{\n" + line.substring(line.length() - code.length() - 1) + "\n}"
                                def temp_line2 = line.substring(0, line.length() - code.length() - 1)
                                temp_line = temp_line2 + temp_line1
                            }

                            oldContent = oldContent + temp_line + System.lineSeparator()
                            numberOfLineAdded2 += 2
                        } else {
                            oldContent = oldContent + line + System.lineSeparator()
                        }
                        line = reader.readLine()
                        lineNum2++
                    }
                    String newContent = oldContent
                    FileWriter writer = new FileWriter(fileToBeModified)
                    writer.write(newContent)

                    reader.close()
                    writer.close()
                    numberOfLineAdded += numberOfLineAdded2
                }
                else if(exceptionBool == 2) { //case2: if method have only one line
                    File fileToBeModified = of.getFile()
                    String oldContent = ""
                    BufferedReader reader = new BufferedReader(new FileReader(fileToBeModified))
                    String line = reader.readLine()
                    int lineNum2 = 1;
                    while (line != null) {
                        if (lineNum + numberOfLineAdded + 1 == lineNum2) {
                            def ind = line.indexOf('{')
                            def ind2 = line.indexOf('}')
                            def temp_line1 = line.substring(0, ind+1)
                            def temp_line2 = line.substring(ind+1, ind2)
                            def temp_line = temp_line1 + "\n" + code + "\n" + temp_line2 + "\n}"
                            oldContent = oldContent + temp_line + System.lineSeparator()
                            numberOfLineAdded2 += addLine
                            numberOfLineAdded2 += 2
                        } else {
                            oldContent = oldContent + line + System.lineSeparator()
                        }
                        line = reader.readLine()
                        lineNum2++
                    }
                    String newContent = oldContent
                    FileWriter writer = new FileWriter(fileToBeModified)
                    writer.write(newContent)

                    reader.close()
                    writer.close()
                    numberOfLineAdded += numberOfLineAdded2
                }
                /*else if(exceptionBool == 3) {
                    File fileToBeModified = of.getFile()
                    String oldContent = ""
                    BufferedReader reader = new BufferedReader(new FileReader(fileToBeModified))
                    String line = reader.readLine()
                    int lineNum2 = 1;
                    while (line != null) {
                        if (lineNum + numberOfLineAdded + 1 == lineNum2) {
                            println code
                        } else {
                            //oldContent = oldContent + line + System.lineSeparator()
                        }
                        oldContent = oldContent + line + System.lineSeparator()
                        line = reader.readLine()
                        lineNum2++
                    }
                    String newContent = oldContent
                    FileWriter writer = new FileWriter(fileToBeModified)
                    writer.write(newContent)

                    reader.close()
                    writer.close()
                    //println code
                }*/
            }
            else if(exceptionBool == 0) { //general case
                lines = lines.plus(lineNum + numberOfLineAdded, code)
                f.text = lines.join('\n')
                numberOfLineAdded += addLine
            }
        }
    }
    def summarize()
    {

    }

    void removeVariables() {
        for(String p : pageNames) {
            for(String m : methodNames) {
                if(m.equals(p))
                    methodNames.remove(p);
            }
        }
    }

    void createOutputFile(String filename, String fileText) {
        String name = "output/" + filename
        of = new OutFile(name)
        of.removeFileText()
        of.append(fileText)

    }

    // store action Set (get the action information from the database)
    void setActionSet() {
        actionSet = ["setLightingMode", "setAirConditionerMode", "both", "off", "siren", "strobe", "setMute", "mute", "unmute",
                     "setVolume", "volumeUp", "volumeDown", "setColor", "setHue", "setSaturation", "setColorTemperature", "setDishwasherMode",
                     "setMachineState", "close", "open", "setDryerMode", "setMachineState", "close", "open", "setFanSpeed", "setInfraredLevel",
                     "lock", "unlock", "setInputSource", "setPlaybackRepeatMode", "setPlaybackShuffle", "setPlaybackStatus", "play", "pause", "stop",
                     "fastForward", "rewind", "setOvenMode", "setMachineState", "stop", "setOvenSetpoint", "setRapidCooling", "setRefrigerationSetpoint",
                     "setRobotCleanerCleaningMode", "setRobotCleanerMovement", "setRobotCleanerTurboMode", "setLevel", "off", "on", "setCoolingSetpoint",
                     "fanAuto", "fanCirculate", "fanOn", "setThermostatFanMode", "setHeatingSetpoint", "auto", "cool", "emergencyHeat", "heat", "off", "setThermostatMode",
                     "beep", "setTvChannel", "channelUp", "channelDown", "close", "open", "setWasherMode", "setMachineState", "close", "open", "presetPosition" ]

    }

    //for multiple files -> reset variables for each file
    void resetVariables() {
        numberOfLineAdded = 0
        closureDeviceNames = new ArrayList<Map>()

        deviceNames = new HashSet<String>()
        inputDeviceNames = new HashSet<String>()
        outputDeviceNames = new HashSet<String>()
        eventNames = new HashSet<String>()
        handlerMethodNames = new HashSet<String>()
        actionNames = new HashSet<String>()
        methodNames = new HashSet<String>()
        eventHandlerPairs = new HashSet<String>()

        insertCodeMap = new ArrayList<Map>()
        deviceNames2 = new HashSet<Map>()

        device_handlerPair = new HashSet<Map>()
        method_returnPair = new HashSet<Map>()
        ternaryLineNumber = new HashSet<Map>()

        pageNames = new ArrayList<String>()
        scheduleMethodNames = new HashSet<String>()
        scheduleTimeandMethod = new HashSet<Map>()

        receiver_actionPair = new HashSet<Map>()

        inputVariableNames = new HashSet<Map>()
        methodParameterNames = new HashSet<Map>()

        skipMethod = true
        inIfStat = false
        inHandler = false

        preferenceStartLine = 0

        actionId = 1
        currentLineNum = 0

        isPage = false

        firstPageLineNumber = 0
        lastPageLineNumber = 0
        ignoreMethodNames = new HashSet<String>()

        currentMethod = new String()
    }
}

