var pgp = require("pg-promise")();
const { publicDecrypt } = require("crypto");
var queryString = require("querystring");
const db = pgp('postgresql://postgres:air2020@localhost:5432/rnaipl');
var chklstId = null;
var chklstSeqNbr = null;
var chklstDtlId = null;
var taskId = null;
var taskDtlId = null;

exports.getTemplateList = function(req, res) {

    //const db = pgp('postgresql://postgres:air2020@localhost:5432/rnaipl');
    db.any("SELECT chklst_id,chklst_name,station_name,total_no_instruction FROM chklst_hdr WHERE status_code = 90;")
    .then((data) => {
        templateList=data;
        res.render("templateList", templateList);
    }).catch(error => res.send(error));

};

exports.postTemplateList = function(req, res) {
    chklstId = req.body.chklstId;
    chklstSeqNbr = 0;
    /*console.log(chklstId);*/
    const query = queryString.stringify({
        "chklstId":chklstId,
        "chklstSeqNbr":0
    });
    
    res.redirect("/operator/executeInspection/?" + query);
    /*db.task(getWorkInstructionDetails)
    .then((data) => {
        res.locals.inspectionDetails = data;
        console.log(res.locals.inspectionDetails);
        res.render("executeInspection",res.locals.inspectionDetails);  
        //res.send("Hello");
    })
    .catch(error => {
        console.log(error);
    });*/
};


exports.getExecuteInspection = function(req, res) {
    chklstId = req.query.chklstId;
    chklstSeqNbr = req.query.chklstSeqNbr;

    db.one(`SELECT cd.chklst_dtl_id FROM public.chklst_dtl cd WHERE cd.chklst_id = $1 and cd.chklst_seq_nbr = $2;`, [chklstId, chklstSeqNbr], e => e.chklst_dtl_id)
    .then((data) => {
        chklstDtlId = data;
        db.oneOrNone(`SELECT td.task_dtl_id, td.status_code FROM public.task_dtl td WHERE td.chklst_dtl_id = $1;`, [data])
        .then((data) => {
            if(data === null) {
                db.oneOrNone(`SELECT th.task_id FROM public.task_hdr th WHERE th.chklst_id = $1;`, [chklstId])
                .then((data) => {
                    if(data === null) {
                        db.one(`INSERT INTO public.task_hdr(chklst_id, status_code, created_dttm, updated_dttm) VALUES($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING task_id;`, [chklstId,0])
                        .then((data) => {
                            taskId = data.task_id;
                            console.log("task_hdr.task_id- " + taskId);
                            db.tx(insertTaskRecords)
                            .then((data) => {
                                db.task(getWorkInstructionDetails)
                                .then((data) => {
                                    res.locals.inspectionDetails = data;
                                    res.locals.inspectionDetails[0]["task_dtl_id"] = taskDtlId;
                                    console.log(res.locals.inspectionDetails[0]);
                                    res.render("executeInspection",res.locals.inspectionDetails);
                                }).catch(error => {
                                    console.log(error);
                                });
                            }).catch(error => {
                                console.log(error);
                            });
                        }).catch(error => {
                            console.log(error);
                        });
                    }
                    else {
                        taskId = data.task_id;
                        db.tx(insertTaskRecords)
                        .then((data) => {
                            db.task(getWorkInstructionDetails)
                            .then((data) => {
                                res.locals.inspectionDetails = data;
                                res.locals.inspectionDetails[0]["task_dtl_id"] = taskDtlId;
                                console.log(res.locals.inspectionDetails[0]);
                                res.render("executeInspection",res.locals.inspectionDetails);
                             }).catch(error => {
                                res.send(error);
                             })
                        }).catch(error => {
                            res.send(error);
                        });
                    }

                }).catch(error => {
                    res.send(error);
                });
            }
            else {

                if(data.status_code === '0') {
                    db.task(getWorkInstructionDetails)
                    .then((data) => {
                        res.locals.inspectionDetails = data;
                        res.locals.inspectionDetails[0]["task_dtl_id"] = taskDtlId;
                        console.log(res.locals.inspectionDetails[0]);
                        res.render("executeInspection",res.locals.inspectionDetails);
                    }).catch(error => {
                        res.send(error);
                    });
                }
                else {
                    db.task(getWorkInstructionDetailsCompleted)
                    .then((data) => {
                        res.locals.inspectionDetails = data;
                        console.log(res.locals.inspectionDetails[0]);
                        res.render("executeInspectionCompleted",res.locals.inspectionDetails);
                    }).catch(error => {
                        res.send(error);
                    });
                }
            }
        }).catch(error => {
            res.send(error);
        });
    }).catch(error => {
        res.send(error);
    });
   
};

exports.postExecuteInspection = function(req, res) {
    var postChklstId = req.body.postchklstId;
    var postChklstSeqNbr = req.body.postchklstSeqNbr;
    var postChklstDtlId = req.body.postchklstDtlId;
    var postTaskDtlId = req.body.posttaskDtlId;
    var postInputField1Value = req.body.posthiddenInputField1Value;
    var postInputField2Value = req.body.posthiddenInputField2Value;
    var postCommentValue = req.body.posthiddenCommentValue;
    var postJudgementValue = req.body.posthiddenJudgementButtonValue;
    console.log("Checklist ID- " + postChklstId + ", Checklist Seq Number- " + postChklstSeqNbr + ", Checklist Detail Id- " + postChklstDtlId + ", Input Field 1: " + postInputField1Value + ", Input Field 2: " + postInputField2Value + ", Comments: " + postCommentValue + ", Judgement- " + postJudgementValue + ", Task Dtl Id- " + postTaskDtlId);

    db.one(`SELECT MAX(chklst_seq_nbr) FROM public.chklst_dtl WHERE chklst_id = $1;`, [postChklstId])
    .then((data) => {
        if(data.max < postChklstSeqNbr+1) {
            console.log("data.max-" + data.max);
            console.log("postChklstSeqNbr-" + postChklstSeqNbr+1);
            res.send("Inspection completed");
        }
        else {
            chklstId = postChklstId;
            chklstSeqNbr = postChklstSeqNbr+1;
            const query = queryString.stringify({
                "chklstId":chklstId,
                "chklstSeqNbr":chklstSeqNbr
            });
            res.redirect("/operator/executeInspection/?" + query);
        }
    })
}

function insertTaskRecords(pgp) {
    console.log("inside insertTaskRecords");
    return pgp.one(`INSERT INTO public.task_dtl(task_id, task_seq_nbr, status_code, chklst_dtl_id, created_dttm, updated_dttm) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING task_dtl_id;`, [taskId, chklstSeqNbr, 0, chklstDtlId])
    .then((data) => {
        taskDtlId = data.task_dtl_id;
        return pgp.batch([
            pgp.none(`INSERT INTO public.task_component(task_dtl_id, chklst_component_id, composite_component, created_dttm, updated_dttm) 
            SELECT td.task_dtl_id, cc.chklst_component_id, cc.composite_component, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM public.task_dtl td INNER JOIN public.chklst_component cc ON td.chklst_dtl_id = cc.chklst_dtl_id AND td.task_dtl_id = $1;`, [data.task_dtl_id]),
            pgp.none(`INSERT INTO public.task_composite_component_mapping(task_component_id, task_child_component_id, created_dttm, updated_dttm)
            SELECT tc1.task_component_id, tc2.task_component_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM public.task_component tc1 
            INNER JOIN public.task_component tc2
            ON tc2.chklst_component_id IN 
            (SELECT cccm.chklst_child_component_id FROM public.chklst_composite_component_mapping cccm WHERE tc1.chklst_component_id = cccm.chklst_component_id)
            AND tc1.task_dtl_id = $1
            AND tc1.composite_component = 'Y';`, [data.task_dtl_id]),
            pgp.none(`INSERT INTO public.task_component_property(task_component_id, property_name, property_value, property_type, created_dttm, updated_dttm)
            SELECT tc.task_component_id, ccp.property_name, ccp.property_value, ccp.property_type, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM public.task_component tc
            INNER JOIN public.chklst_component_property ccp
            ON tc.chklst_component_id = ccp.chklst_component_id
            AND tc.task_dtl_id = $1;`, [data.task_dtl_id])
        ]);
    });

}


function getWorkInstructionDetails(pgp) {

    const v = q => pgp.any(`SELECT co.component_name, ccp.property_name, ccp.property_value, ccp.property_type
    FROM public.chklst_hdr ch
    INNER JOIN public.chklst_dtl cd 
    ON ch.chklst_id = cd.chklst_id AND ch.chklst_id = $1 AND cd.chklst_seq_nbr = $2
    INNER JOIN public.chklst_component cc
    ON cd.chklst_dtl_id = cc.chklst_dtl_id
    INNER JOIN public.component co
    ON co.component_id = cc.base_component_id
    INNER JOIN public.chklst_composite_component_mapping cccm
    ON cc.chklst_component_id = cccm.chklst_component_id
    INNER JOIN public.chklst_component_property ccp
    ON ccp.chklst_component_id = cccm.chklst_child_component_id AND ccp.property_type = 'display' 
    ORDER BY 
        CASE co.component_name
            WHEN 'img' THEN 1
            WHEN 'inputField1' THEN 2
            WHEN 'inputField2' THEN 3
            WHEN 'comment' THEN 4
            WHEN 'capture' THEN 5
            WHEN 'judgement' THEN 6
            END, ccp.property_name;`,[q.chklst_id, q.chklst_seq_nbr])
    .then(workInstructions => {
        q.workInstructions = workInstructions;
        return q;
    });

    return pgp.map(`SELECT ch.chklst_id, ch.chklst_name, ch.station_name, ch.total_no_instruction, 
    cd.chklst_seq_nbr, cd.chklst_dtl_id, cd.process_name, cd.check_location, cd.check_details
    FROM public.chklst_hdr ch 
    INNER JOIN public.chklst_dtl cd
    ON ch.chklst_id = cd.chklst_id
    AND ch.chklst_id = $1 AND cd.chklst_seq_nbr = $2;`, [chklstId,chklstSeqNbr], v).then(a => pgp.batch(a));

};

function getWorkInstructionDetailsCompleted(pgp) {

};