package samonitor

import org.codehaus.groovy.control.CompilerConfiguration
import org.codehaus.groovy.control.MultipleCompilationErrorsException

class SmartAppAnalyzerDriver {
    static main(def args) {
        def project_root = "."
        def sourceCodeDir = "SmartApp"


        CompilerConfiguration cc = new CompilerConfiguration(CompilerConfiguration.DEFAULT)
        SmartAppAnalyzer sas = new SmartAppAnalyzer()
        cc.addCompilationCustomizers(sas)
        GroovyShell gshell = new GroovyShell(cc)
        new File(sourceCodeDir).eachFile { f ->
            try {
                sas.resetVariables()
                gshell.evaluate(f)
            } catch (MissingMethodException mme) {
                def missingMethod = mme.toString()
                if (!missingMethod.contains("definition"))
                    println "missing method: " + missingMethod
            } catch(MultipleCompilationErrorsException mcee) {
                mcee.printStackTrace()
            }
        }
    }
}
