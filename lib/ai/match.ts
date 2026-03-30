// AI Teacher Matching Logic
interface Parent {
  child_classroom: string;
}

interface Teacher {
  id: string;
  name: string;
  classroom: string;
}

interface RankedTeacher extends Teacher {
  rank: number;
  reasoning: string;
}

/**
 * Matches and ranks teachers based on parent requirements.
 * Primary signal: same classroom as child (highest familiarity).
 */
export async function matchTeachers(parent: Parent, teachers: Teacher[]): Promise<RankedTeacher[]> {
  const hasClassroom = parent.child_classroom !== "";

  const ranked = teachers
    .map((teacher) => {
      const isSameClassroom = hasClassroom && teacher.classroom === parent.child_classroom;
      return {
        ...teacher,
        rank: isSameClassroom ? 1 : 2,
        reasoning: isSameClassroom
          ? `Same classroom as child — highest familiarity.`
          : hasClassroom
            ? `Different classroom — less familiar with child.`
            : "Available during your requested dates.",
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map((teacher, index) => ({ ...teacher, rank: index + 1 }));

  return ranked;
}
