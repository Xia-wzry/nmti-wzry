// NMTI v3 评分与人格判定
// 输入：ans 数组（每题答案，可以是数字 / Set（多选）/ 隐藏选项=q.o.length）
// 输出：{ persona: id, scores: {op,win,rage,team,social}, normalized: {...}, easter: {timeTraveler:bool} }

(function(){

// 计算原始分 + 标准化分
function computeScores(ans){
  var Q = window.QUESTIONS;
  var raw = {op:0,win:0,rage:0,team:0,social:0};
  var multiQ8Count = 0;

  for(var i=0;i<Q.length;i++){
    var q = Q[i], a = ans[i];
    if(a==null) continue;

    if(a instanceof Set){
      a.forEach(function(x){ addScore(raw, q.o[x].s); });
      if(i===7){ multiQ8Count = a.size; } // 第8题
    } else if(q.hid && a===q.o.length){
      // 第15题隐藏 D
      addScore(raw, (q.ho && q.ho.s) || {});
    } else if(a < q.o.length){
      addScore(raw, q.o[a].s);
    }
  }

  // 偷偷放屁者条件：5 项全部命中才触发
  // 前提：第3题"我不知道"
  // 且 后 4 条全部满足：第5BC / 第6C / 第7AC / 第8多选≥3
  var pootQ3 = (ans[2]===2);                       // 第3题"我不知道"
  var pootQ5 = (ans[4]===1 || ans[4]===2);         // 第5题 B/C
  var pootQ6 = (ans[5]===2);                       // 第6题 C
  var pootQ7 = (ans[6]===0 || ans[6]===2);         // 第7题 A/C
  var pootQ8 = (multiQ8Count>=3);                  // 第8题多选≥3
  var pootAll = pootQ3 && pootQ5 && pootQ6 && pootQ7 && pootQ8;

  // 标准化
  var R = window.DIM_RANGE;
  var norm = {};
  Object.keys(R).forEach(function(d){
    var v = (raw[d]-R[d].min) / (R[d].max-R[d].min);
    norm[d] = Math.max(0, Math.min(1, v));
  });

  return { raw:raw, norm:norm, pootAll:pootAll };
}

function addScore(target, src){
  if(!src) return;
  Object.keys(src).forEach(function(k){
    if(target[k]!==undefined) target[k] += src[k];
  });
}

// 维度按分数排序，平手按 DIM_PRIORITY
function rankDims(norm){
  var dims = ['op','win','rage','team','social'];
  var P = window.DIM_PRIORITY;
  // 复制再排
  var arr = dims.slice();
  arr.sort(function(a,b){
    if(norm[b]!==norm[a]) return norm[b]-norm[a];
    return P.indexOf(a)-P.indexOf(b); // 平手按优先级
  });
  return arr; // [最高, 次高, 中, 次低, 最低]
}

// === 主判定函数 ===
function judge(ans){
  var s = computeScores(ans);
  var norm = s.norm;
  var ranks = rankDims(norm);
  var top = ranks[0], second = ranks[1], third = ranks[2];
  var bottom = ranks[4], secondBottom = ranks[3];

  // 是否五维全等
  var allEq = (norm.op===norm.win && norm.win===norm.rage && norm.rage===norm.team && norm.team===norm.social);
  var allOver05 = (norm.op>0.5 && norm.win>0.5 && norm.rage>0.5 && norm.team>0.5 && norm.social>0.5);

  // ========== 优先级 1: 偷偷放屁者 ==========
  // 条件：第3题"我不知道" + 第5BC + 第6C + 第7AC + 第8多选≥3（5 项全中）
  // 或 五维全等且都>0.5（极端平均情况）
  if(s.pootAll) return 'toutoufangpizhe';
  if(allEq && allOver05) return 'toutoufangpizhe';

  // ========== 优先级 2: 高优先级覆盖 ==========
  // 团队之光（最高优先级，避免被死者/荣耀王者抢走）：
  //   最高=胜负 + 第二高=团队 + 最低=暴躁
  //   最高=团队 + 第二高=胜负 + 最低=暴躁
  if(bottom==='rage'){
    if(top==='win' && second==='team') return 'tuanduizhiguang';
    if(top==='team' && second==='win') return 'tuanduizhiguang';
  }
  // 空大者优先于死者：top=win + bot=op（操作极低+胜负极高，典型空大者）
  // 放在死者之前，把"胜负顶+操作谷"的用户抢回空大者
  if(top==='win' && bottom==='op'){
    return 'kongdazhe';
  }
  // 死者：最低=暴躁+次低=操作 或 最低=操作+次低=暴躁
  if((bottom==='rage' && secondBottom==='op') || (bottom==='op' && secondBottom==='rage')){
    return 'sizhe';
  }
  // 荣耀王者：操作/胜负/团队前三高 + 三者均>0.5 + >剩下两维
  if(isAll(['op','win','team'], ranks.slice(0,3))
     && norm.op>0.5 && norm.win>0.5 && norm.team>0.5
     && Math.min(norm.op,norm.win,norm.team) >= Math.max(norm.rage,norm.social)){
    return 'rongyaowangzhe';
  }
  // 不玩王者（"或者"）：五维全 ≤0.5
  if(norm.op<=0.5 && norm.win<=0.5 && norm.rage<=0.5 && norm.team<=0.5 && norm.social<=0.5){
    return 'huozhe';
  }
  // 为母则刚：最高=团队 + 最低=操作（操作差到底但团队意识强）
  // 或 最高=团队 + 最低=操作/社交 + 第6题选D（主动替队友承受伤害）
  if(top==='team' && bottom==='op'){
    return 'weimuzegang';
  }
  if(top==='team' && ans[5]===3 && (bottom==='op' || bottom==='social')){
    return 'weimuzegang';
  }
  // 舒服者：操作+团队前二高均>0.5 + 第7题选C
  if(isAll(['op','team'], ranks.slice(0,2)) && norm.op>0.5 && norm.team>0.5 && ans[6]===2){
    return 'shufuzhe';
  }
  // 怪盗基德：操作+社交前二高均>0.5 + 暴躁<0.4
  if(isAll(['op','social'], ranks.slice(0,2)) && norm.op>0.5 && norm.social>0.5 && norm.rage<0.4){
    return 'guaidaojide';
  }

  // ========== 优先级 3: 主标签查表 + 暴躁特判 ==========
  // 暴躁最低特判（bot=rage，团队之光已在优先级2处理）：
  //   top=win: 用次低重查（通常 team 是次低 → 蓝buff）
  //   top=team:
  //     second=op → 始作俑者
  //     second=social → 积分夺宝券
  //     其他（second=rage 不可能）→ 用次低重查兜底
  //   top=op/social/rage: 直接查表（霸者/风静龙王等）
  if(bottom==='rage'){
    if(top==='win'){
      return tableLookup(top, secondBottom);
    }
    if(top==='team'){
      if(second==='op') return 'shizuoyongzhe';
      if(second==='social') return 'jifenduobaoquan';
      return tableLookup(top, secondBottom);
    }
  }
  return tableLookup(top, bottom);
}

// 工具：a 的所有元素都在 b 里
function isAll(a, b){
  for(var i=0;i<a.length;i++) if(b.indexOf(a[i])<0) return false;
  return true;
}

// 主标签查表
function tableLookup(top, bot){
  var T = {
    op:    {win:'guashazhe',  rage:'bazhe',           team:'hongbuff',         social:'guyongzhe'},
    win:   {op:'kongdazhe',                            team:'toutazhe',         social:'jifenduobaoquan'},
    rage:  {op:'jiahao',      win:'zuzong',           team:'zhener',           social:'liulanggou'},
    team:  {op:'shizuoyongzhe', win:'lanbuff',                                  social:'jifenduobaoquan'},
    social:{op:'hunzhe',      win:'aidawangzhe',      rage:'fengjinglongwang', team:'wodizhe'}
  };
  if(T[top] && T[top][bot]) return T[top][bot];
  // 兜底（理论上不该走到这）
  return 'huozhe';
}

// 暴露接口
window.NMTI_JUDGE = judge;
window.NMTI_COMPUTE = computeScores;

})();
