package samonitor

import org.codehaus.groovy.ast.ClassCodeVisitorSupport
import org.codehaus.groovy.ast.ClassNode
import org.codehaus.groovy.ast.MethodNode
import org.codehaus.groovy.ast.expr.ConstantExpression
import org.codehaus.groovy.ast.expr.MethodCallExpression
import org.codehaus.groovy.ast.expr.MapExpression
import org.codehaus.groovy.ast.expr.VariableExpression
import org.codehaus.groovy.classgen.GeneratorContext
import org.codehaus.groovy.control.CompilePhase
import org.codehaus.groovy.control.SourceUnit
import org.codehaus.groovy.control.customizers.CompilationCustomizer
import org.codehaus.groovy.transform.GroovyASTTransformation

import javax.lang.model.element.VariableElement

@GroovyASTTransformation(phase = CompilePhase.SEMANTIC_ANALYSIS)
class SmartAppAnalyzer extends CompilationCustomizer {

    Set<Map> options
    Set<String> eventHandler
    SmartAppAnalyzer(){
        super(CompilePhase.SEMANTIC_ANALYSIS)
        options = new HashSet<Map>()
        eventHandler = new HashSet<String>()
    }
    @Override
    void call(SourceUnit source, GeneratorContext context, ClassNode classNode){
        Analyzer1 analyzer1 = new Analyzer1()
        classNode.visitContents(analyzer1)
        summary()
    }

    class Analyzer1 extends ClassCodeVisitorSupport {

        @Override
        void visitMethod(MethodNode meth) {
            def methodName = meth.getName()
            if(methodName.equals("main") || methodName.equals("run") || methodName.equals("installed") || methodName.equals("updated") || methodName.equals("initialize")) {

            }
            else {
                def notHandler = true
                for(String s : eventHandler) {
                    if(methodName.equals(s)) notHandler = false
                }
                if(notHandler == true) options += ["type": "method", "name": meth.getName()]
            }
            super.visitMethod(meth)
        }
        @Override
        void visitMethodCallExpression(MethodCallExpression mce) {
            def meth = mce.getMethodAsString();
            if(meth.equals("input")) {
                def args = mce.getArguments()
                args.each { arg ->
                    if (arg instanceof ConstantExpression) {
                        def input = arg.getText()
                        //if(!input.contains(".")) options += ["type": "input", "name": input]
                    }
                    if (arg instanceof MapExpression) {
                        arg.getMapEntryExpressions().each { m ->
                            if (m.getKeyExpression().getText().equals("name")) {
                                //println m.getValueExpression().getText()
                            }
                        }
                    }
                }
            }
            if(meth.equals("subscribe")) {
                def args = mce.getArguments()
                def arg1
                def arg2
                if(args[1] instanceof ConstantExpression) {
                    arg1 = (ConstantExpression) args[1]
                    //options += ["type": "event", "name": arg1.getText()]
                }
                if(args[2] instanceof VariableExpression) {
                    arg2 = (VariableExpression) args[2]
                    //options += ["type": "eventHandler", "name": arg2.getName()]
                    options += ["type": "event", "name": arg1.getText() + "-" + arg2.getName()]
                    eventHandler.add(arg2.getName())
                }
            }

            else {
                if(meth.equals("runScript") || meth.equals("definition") || meth.equals("preferences") || meth.equals("section") || meth.equals("input") || meth.equals("initialize") || meth.equals("unsubscribe")) {

                }
                else if(meth.equals("currentValue") || meth.equals("currentState")) {

                }
                else if(meth.equals("size") || meth.equals("findAll") || meth.equals("each")) {

                }
                else if(meth.equals("find") || meth.equals("split") || meth.equals("contains") || meth.equals("join") || meth.equals("parseText") || meth.equals("format")) {

                }
                else if(meth.equals("SimpleDateFormat") || meth.equals("setTimeZone") || meth.equals("getTimeZone")) {

                }
                else {
                    String receiver = mce.getReceiver().getText()
                    if(receiver.equals("this") || receiver.equals("log")) {
                        if(meth.equals("sendPush") || meth.equals("sendSms") || meth.equals("sendNotification") || meth.equals("setLocationMode")) {
                            options += ["type": "action", "name": meth]
                        }
                    }
                    else
                        options += ["type": "action", "name": mce.getReceiver().getText() + "." + meth]
                }
            }

            super.visitMethodCallExpression(mce)
        }
        @Override
        protected SourceUnit getSourceUnit() {
            return null
        }
    }

    def summary() {
        for(Map m : options) {
            println m;
        }
    }

    def resetVariables() {
        options = new HashSet<Map>()
        eventHandler = new HashSet<String>()
    }

}
